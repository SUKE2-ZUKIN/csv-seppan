import React, { useState } from 'react';
import { SettingsData } from '../App';

interface SettingsProps {
  headers: string[];
  settings: SettingsData;
  onSubmit: (settings: SettingsData) => void;
  onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({ headers, settings, onSubmit, onBack }) => {
  const [formData, setFormData] = useState<SettingsData>(settings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.owner_pattern.trim()) {
      alert('家族代表者の識別文字列を入力してください');
      return;
    }
    
    if (!formData.spouse_pattern.trim()) {
      alert('配偶者の識別文字列を入力してください');
      return;
    }

    if (formData.owner_ratio + formData.spouse_ratio !== 100) {
      alert('折半比率の合計は100%である必要があります');
      return;
    }

    onSubmit(formData);
  };

  const handleRatioChange = (type: 'owner' | 'spouse', value: number) => {
    if (type === 'owner') {
      setFormData({
        ...formData,
        owner_ratio: value,
        spouse_ratio: 100 - value,
      });
    } else {
      setFormData({
        ...formData,
        spouse_ratio: value,
        owner_ratio: 100 - value,
      });
    }
  };

  return (
    <div className="settings">
      <h2>設定</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="setting-group">
          <label htmlFor="identification_column">識別カラム選択</label>
          <select
            id="identification_column"
            value={formData.identification_column}
            onChange={(e) => setFormData({ ...formData, identification_column: e.target.value })}
          >
            <option value="中項目">中項目</option>
            <option value="大項目">大項目</option>
            <option value="内容">内容</option>
            <option value="メモ">メモ</option>
            {headers.map((header, index) => (
              <option key={index} value={header}>{header}</option>
            ))}
          </select>
          <small>支出の分類に使用するカラムを選択してください</small>
        </div>

        <div className="setting-group">
          <label htmlFor="owner_pattern">家族代表者の識別文字列</label>
          <input
            type="text"
            id="owner_pattern"
            value={formData.owner_pattern}
            onChange={(e) => setFormData({ ...formData, owner_pattern: e.target.value })}
            placeholder="例: 夫カード"
            required
          />
          <small>代表者が支払った取引を識別する文字列（正規表現対応）</small>
        </div>

        <div className="setting-group">
          <label htmlFor="spouse_pattern">配偶者の識別文字列</label>
          <input
            type="text"
            id="spouse_pattern"
            value={formData.spouse_pattern}
            onChange={(e) => setFormData({ ...formData, spouse_pattern: e.target.value })}
            placeholder="例: 妻カード"
            required
          />
          <small>配偶者が支払った取引を識別する文字列（正規表現対応）</small>
        </div>

        <div className="setting-group">
          <label>折半比率設定</label>
          <div className="ratio-inputs">
            <div className="ratio-input">
              <label htmlFor="owner_ratio">家族代表者</label>
              <input
                type="number"
                id="owner_ratio"
                value={formData.owner_ratio}
                onChange={(e) => handleRatioChange('owner', parseFloat(e.target.value))}
                min="0"
                max="100"
                step="0.1"
              />
              <span>%</span>
            </div>
            <div className="ratio-separator">:</div>
            <div className="ratio-input">
              <label htmlFor="spouse_ratio">配偶者</label>
              <input
                type="number"
                id="spouse_ratio"
                value={formData.spouse_ratio}
                onChange={(e) => handleRatioChange('spouse', parseFloat(e.target.value))}
                min="0"
                max="100"
                step="0.1"
              />
              <span>%</span>
            </div>
          </div>
          <small>各人の負担比率を設定してください（合計100%）</small>
        </div>

        <div className="button-group">
          <button type="button" onClick={onBack} className="secondary-button">
            戻る
          </button>
          <button type="submit" className="primary-button">
            計算実行
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;