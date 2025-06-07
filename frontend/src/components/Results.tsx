import React, { useState } from 'react';
import { CalculationResult } from '../App';

interface ResultsProps {
  result: CalculationResult;
  onReset: () => void;
  onBack: () => void;
}

const Results: React.FC<ResultsProps> = ({ result, onReset, onBack }) => {
  const [showDetails, setShowDetails] = useState(false);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('ja-JP') + '円';
  };

  const getSettlementMessage = () => {
    if (result.settlement_amount === 0) {
      return '精算は不要です';
    }
    
    const direction = result.settlement_direction === '配偶者から代表者へ' 
      ? '配偶者 → 代表者' 
      : '代表者 → 配偶者';
    
    return `${direction}へ ${formatCurrency(result.settlement_amount)} の精算が必要です`;
  };

  const filteredRecords = {
    owner: result.records.filter(r => r.calculation_target === 'owner'),
    spouse: result.records.filter(r => r.calculation_target === 'spouse'),
    shared: result.records.filter(r => r.calculation_target === 'shared'),
  };

  return (
    <div className="results">
      <h2>計算結果</h2>
      
      <div className="result-summary">
        <div className="period">
          <h3>対象期間</h3>
          <p>{result.period}</p>
        </div>

        <div className="totals">
          <div className="total-item owner">
            <h3>家族代表者の支出</h3>
            <p className="amount">{formatCurrency(result.owner_total)}</p>
          </div>
          
          <div className="total-item spouse">
            <h3>配偶者の支出</h3>
            <p className="amount">{formatCurrency(result.spouse_total)}</p>
          </div>
          
          <div className="total-item total">
            <h3>合計支出</h3>
            <p className="amount">{formatCurrency(result.total_expense)}</p>
          </div>
        </div>

        <div className="shares">
          <div className="share-item">
            <h3>家族代表者の負担額</h3>
            <p className="amount">{formatCurrency(result.owner_share)}</p>
          </div>
          
          <div className="share-item">
            <h3>配偶者の負担額</h3>
            <p className="amount">{formatCurrency(result.spouse_share)}</p>
          </div>
        </div>

        <div className="settlement">
          <h3>精算結果</h3>
          <p className={`settlement-message ${result.settlement_amount === 0 ? 'no-settlement' : 'settlement-required'}`}>
            {getSettlementMessage()}
          </p>
        </div>
      </div>

      <div className="details-section">
        <button 
          className="toggle-details"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? '詳細を非表示' : '詳細を表示'}
        </button>

        {showDetails && (
          <div className="transaction-details">
            <div className="transaction-category">
              <h4>家族代表者の支出 ({filteredRecords.owner.length}件)</h4>
              <div className="transaction-list">
                {filteredRecords.owner.map((record, index) => (
                  <div key={index} className="transaction-item">
                    <span className="date">{record.date}</span>
                    <span className="content">{record.content}</span>
                    <span className="amount">{formatCurrency(record.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="transaction-category">
              <h4>配偶者の支出 ({filteredRecords.spouse.length}件)</h4>
              <div className="transaction-list">
                {filteredRecords.spouse.map((record, index) => (
                  <div key={index} className="transaction-item">
                    <span className="date">{record.date}</span>
                    <span className="content">{record.content}</span>
                    <span className="amount">{formatCurrency(record.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="transaction-category">
              <h4>共通・その他の支出 ({filteredRecords.shared.length}件)</h4>
              <div className="transaction-list">
                {filteredRecords.shared.map((record, index) => (
                  <div key={index} className="transaction-item">
                    <span className="date">{record.date}</span>
                    <span className="content">{record.content}</span>
                    <span className="amount">{formatCurrency(record.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="button-group">
        <button onClick={onBack} className="secondary-button">
          設定を変更
        </button>
        <button onClick={onReset} className="secondary-button">
          最初から
        </button>
      </div>
    </div>
  );
};

export default Results;