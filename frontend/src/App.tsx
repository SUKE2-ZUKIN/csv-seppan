import React, { useState } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import Settings from './components/Settings';
import Results from './components/Results';

export interface CSVRecord {
  calculation_target: string;
  date: string;
  content: string;
  amount: number;
  institution: string;
  large_category: string;
  medium_category: string;
  memo: string;
  transfer: string;
  id: string;
}

export interface SettingsData {
  identification_column: string;
  owner_pattern: string;
  spouse_pattern: string;
  owner_ratio: number;
  spouse_ratio: number;
}

export interface CalculationResult {
  period: string;
  owner_total: number;
  spouse_total: number;
  total_expense: number;
  owner_share: number;
  spouse_share: number;
  settlement_amount: number;
  settlement_direction: string;
  records: CSVRecord[];
}

function App() {
  const [csvData, setCsvData] = useState<CSVRecord[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [settings, setSettings] = useState<SettingsData>({
    identification_column: '中項目',
    owner_pattern: '',
    spouse_pattern: '',
    owner_ratio: 50,
    spouse_ratio: 50,
  });
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'settings' | 'results'>('upload');

  const handleFileUpload = (data: CSVRecord[], fileHeaders: string[]) => {
    setCsvData(data);
    setHeaders(fileHeaders);
    setCurrentStep('settings');
  };

  const handleSettingsSubmit = async (newSettings: SettingsData) => {
    setSettings(newSettings);
    
    try {
      const response = await fetch('http://localhost:8080/api/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: csvData,
          settings: newSettings,
        }),
      });

      if (response.ok) {
        const calculationResult = await response.json();
        setResult(calculationResult);
        setCurrentStep('results');
      } else {
        alert('計算エラーが発生しました');
      }
    } catch (error) {
      console.error('API Error:', error);
      alert('サーバーとの通信エラーが発生しました');
    }
  };

  const handleReset = () => {
    setCsvData([]);
    setHeaders([]);
    setResult(null);
    setCurrentStep('upload');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>共働きコスト折半ツール</h1>
        <div className="step-indicator">
          <span className={currentStep === 'upload' ? 'active' : ''}>1. ファイルアップロード</span>
          <span className={currentStep === 'settings' ? 'active' : ''}>2. 設定</span>
          <span className={currentStep === 'results' ? 'active' : ''}>3. 結果</span>
        </div>
      </header>

      <main className="App-main">
        {currentStep === 'upload' && (
          <FileUpload onFileUpload={handleFileUpload} />
        )}

        {currentStep === 'settings' && (
          <Settings
            headers={headers}
            settings={settings}
            onSubmit={handleSettingsSubmit}
            onBack={() => setCurrentStep('upload')}
          />
        )}

        {currentStep === 'results' && result && (
          <Results
            result={result}
            onReset={handleReset}
            onBack={() => setCurrentStep('settings')}
          />
        )}
      </main>
    </div>
  );
}

export default App;