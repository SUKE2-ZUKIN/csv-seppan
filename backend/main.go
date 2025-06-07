package main

import (
	"encoding/csv"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/text/encoding/japanese"
	"golang.org/x/text/transform"
)

type CSVRecord struct {
	CalculationTarget string `json:"calculation_target"`
	Date              string `json:"date"`
	Content           string `json:"content"`
	Amount            int    `json:"amount"`
	Institution       string `json:"institution"`
	LargeCategory     string `json:"large_category"`
	MediumCategory    string `json:"medium_category"`
	Memo              string `json:"memo"`
	Transfer          string `json:"transfer"`
	ID                string `json:"id"`
}

type Settings struct {
	IdentificationColumn string  `json:"identification_column"`
	OwnerPattern         string  `json:"owner_pattern"`
	SpousePattern        string  `json:"spouse_pattern"`
	OwnerRatio           float64 `json:"owner_ratio"`
	SpouseRatio          float64 `json:"spouse_ratio"`
}

type CalculationResult struct {
	Period              string      `json:"period"`
	OwnerTotal          int         `json:"owner_total"`
	SpouseTotal         int         `json:"spouse_total"`
	TotalExpense        int         `json:"total_expense"`
	OwnerShare          int         `json:"owner_share"`
	SpouseShare         int         `json:"spouse_share"`
	SettlementAmount    int         `json:"settlement_amount"`
	SettlementDirection string      `json:"settlement_direction"`
	Records             []CSVRecord `json:"records"`
}

func main() {
	// デバッグモードを設定（本番環境では gin.ReleaseMode に変更）
	gin.SetMode(gin.DebugMode)
	
	r := gin.Default()
	
	// リクエスト/レスポンスのログを出力
	r.Use(gin.Logger())

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	r.POST("/api/upload", handleUpload)
	r.POST("/api/calculate", handleCalculate)

	r.Run(":8080")
}

func handleUpload(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		fmt.Printf("DEBUG: ファイル取得エラー: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "ファイルの取得に失敗しました"})
		return
	}
	defer file.Close()

	fmt.Printf("DEBUG: ファイル名: %s, サイズ: %d bytes\n", header.Filename, header.Size)

	if header.Size > 10*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ファイルサイズが10MBを超えています"})
		return
	}

	decoder := transform.NewReader(file, japanese.ShiftJIS.NewDecoder())
	reader := csv.NewReader(decoder)

	var records []CSVRecord
	var headers []string

	for i := 0; ; i++ {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			fmt.Printf("DEBUG: CSV読み込みエラー (行%d): %v\n", i, err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "CSVファイルの読み込みに失敗しました"})
			return
		}

		if i == 0 {
			headers = record
			fmt.Printf("DEBUG: CSVヘッダー: %v\n", headers)
			continue
		}

		if len(record) < 10 {
			fmt.Printf("DEBUG: スキップした行 %d (カラム数不足): %v\n", i, record)
			continue
		}

		amount, err := strconv.Atoi(strings.ReplaceAll(record[3], ",", ""))
		if err != nil {
			fmt.Printf("DEBUG: 金額変換エラー (行%d): %s -> %v\n", i, record[3], err)
			amount = 0
		}

		csvRecord := CSVRecord{
			CalculationTarget: record[0],
			Date:              record[1],
			Content:           record[2],
			Amount:            amount,
			Institution:       record[4],
			LargeCategory:     record[5],
			MediumCategory:    record[6],
			Memo:              record[7],
			Transfer:          record[8],
			ID:                record[9],
		}

		// 全レコードをデバッグ出力
		fmt.Printf("DEBUG: レコード %d: %+v\n", i, csvRecord)

		records = append(records, csvRecord)
	}

	fmt.Printf("DEBUG: 総レコード数: %d\n", len(records))

	c.JSON(http.StatusOK, gin.H{
		"headers": headers,
		"records": records,
	})
}

func handleCalculate(c *gin.Context) {
	var request struct {
		Records  []CSVRecord `json:"records"`
		Settings Settings    `json:"settings"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		fmt.Printf("DEBUG: リクエスト解析エラー: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストの解析に失敗しました"})
		return
	}
	
	fmt.Printf("DEBUG: 計算リクエスト受信 - レコード数: %d\n", len(request.Records))

	result := calculateExpenseSplit(request.Records, request.Settings)
	c.JSON(http.StatusOK, result)
}

func calculateExpenseSplit(records []CSVRecord, settings Settings) CalculationResult {
	fmt.Printf("DEBUG: 計算開始 - レコード数: %d\n", len(records))
	fmt.Printf("DEBUG: 設定: %+v\n", settings)

	var ownerTotal, spouseTotal int
	var minDate, maxDate string

	ownerRegex, err := regexp.Compile(settings.OwnerPattern)
	if err != nil {
		fmt.Printf("DEBUG: 代表者正規表現コンパイルエラー: %v\n", err)
		ownerRegex = regexp.MustCompile("(?i)" + regexp.QuoteMeta(settings.OwnerPattern))
	}

	spouseRegex, err := regexp.Compile(settings.SpousePattern)
	if err != nil {
		fmt.Printf("DEBUG: 配偶者正規表現コンパイルエラー: %v\n", err)
		spouseRegex = regexp.MustCompile("(?i)" + regexp.QuoteMeta(settings.SpousePattern))
	}

	fmt.Printf("DEBUG: 代表者パターン: %s, 配偶者パターン: %s\n", settings.OwnerPattern, settings.SpousePattern)

	var ownerMatches, spouseMatches, sharedCount int

	for i, record := range records {
		// 支出は負の値で記録されているため、絶対値で処理
		if record.Amount == 0 {
			fmt.Printf("DEBUG: スキップ (金額0): %+v\n", record)
			continue
		}
		
		// 収入（正の値）はスキップ
		if record.Amount > 0 {
			fmt.Printf("DEBUG: スキップ (収入): %+v\n", record)
			continue
		}
		
		// 支出の絶対値を使用
		absAmount := -record.Amount

		if minDate == "" || record.Date < minDate {
			minDate = record.Date
		}
		if maxDate == "" || record.Date > maxDate {
			maxDate = record.Date
		}

		var identificationValue string
		switch settings.IdentificationColumn {
		case "中項目":
			identificationValue = record.MediumCategory
		case "大項目":
			identificationValue = record.LargeCategory
		case "内容":
			identificationValue = record.Content
		case "メモ":
			identificationValue = record.Memo
		default:
			identificationValue = record.MediumCategory
		}

		// 全レコードの識別値と金額をデバッグ出力
		fmt.Printf("DEBUG: レコード%d - 識別カラム:'%s' 識別値:'%s' 金額:%d\n", 
			i, settings.IdentificationColumn, identificationValue, record.Amount)

		if ownerRegex.MatchString(identificationValue) {
			ownerTotal += absAmount
			records[i].CalculationTarget = "owner"
			ownerMatches++
			fmt.Printf("DEBUG: → 代表者マッチ! パターン:'%s' にマッチ 金額:%d円\n", settings.OwnerPattern, absAmount)
		} else if spouseRegex.MatchString(identificationValue) {
			spouseTotal += absAmount
			records[i].CalculationTarget = "spouse"
			spouseMatches++
			fmt.Printf("DEBUG: → 配偶者マッチ! パターン:'%s' にマッチ 金額:%d円\n", settings.SpousePattern, absAmount)
		} else {
			records[i].CalculationTarget = "shared"
			sharedCount++
			fmt.Printf("DEBUG: → 共通支出として扱います\n")
		}
	}

	fmt.Printf("DEBUG: マッチ結果 - 代表者: %d件(%d円), 配偶者: %d件(%d円), 共通: %d件\n", 
		ownerMatches, ownerTotal, spouseMatches, spouseTotal, sharedCount)

	totalExpense := ownerTotal + spouseTotal
	ownerShare := int(float64(totalExpense) * (settings.OwnerRatio / 100))
	spouseShare := totalExpense - ownerShare

	settlementAmount := ownerTotal - ownerShare
	var settlementDirection string

	if settlementAmount > 0 {
		settlementDirection = "配偶者から代表者へ"
	} else if settlementAmount < 0 {
		settlementDirection = "代表者から配偶者へ"
		settlementAmount = -settlementAmount
	} else {
		settlementDirection = "精算不要"
	}

	period := fmt.Sprintf("%s 〜 %s", minDate, maxDate)

	result := CalculationResult{
		Period:              period,
		OwnerTotal:          ownerTotal,
		SpouseTotal:         spouseTotal,
		TotalExpense:        totalExpense,
		OwnerShare:          ownerShare,
		SpouseShare:         spouseShare,
		SettlementAmount:    settlementAmount,
		SettlementDirection: settlementDirection,
		Records:             records,
	}

	fmt.Printf("DEBUG: ==============================================\n")
	fmt.Printf("DEBUG: 計算結果サマリー\n")
	fmt.Printf("DEBUG: ==============================================\n")
	fmt.Printf("DEBUG: 期間: %s\n", result.Period)
	fmt.Printf("DEBUG: 代表者合計支出: %d円 (%d件)\n", result.OwnerTotal, ownerMatches)
	fmt.Printf("DEBUG: 配偶者合計支出: %d円 (%d件)\n", result.SpouseTotal, spouseMatches)
	fmt.Printf("DEBUG: 共通支出: %d件\n", sharedCount)
	fmt.Printf("DEBUG: 支出合計: %d円\n", result.TotalExpense)
	fmt.Printf("DEBUG: 代表者負担額(%g%%): %d円\n", settings.OwnerRatio, result.OwnerShare)
	fmt.Printf("DEBUG: 配偶者負担額(%g%%): %d円\n", settings.SpouseRatio, result.SpouseShare)
	fmt.Printf("DEBUG: 精算額: %d円 (%s)\n", result.SettlementAmount, result.SettlementDirection)
	fmt.Printf("DEBUG: ==============================================")

	return result
}