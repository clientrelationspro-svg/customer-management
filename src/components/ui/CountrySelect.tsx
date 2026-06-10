'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { COUNTRIES, searchCountries } from '@/lib/countries';

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function CountrySelect({ value, onChange, className = '' }: CountrySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCountries, setFilteredCountries] = useState<string[]>(COUNTRIES);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 搜索筛选
  useEffect(() => {
    setFilteredCountries(searchCountries(searchTerm));
  }, [searchTerm]);

  // 打开时滚动到选中项
  useEffect(() => {
    if (isOpen && value && listRef.current) {
      const selectedElement = listRef.current.querySelector('[data-selected="true"]');
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, value]);

  // 选中国家
  const handleSelect = (country: string) => {
    onChange(country);
    setIsOpen(false);
    setSearchTerm('');
  };

  // 清空选择
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 触发按钮 */}
      <div
        className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 cursor-pointer bg-white"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
      >
        <div className="flex-1 flex items-center gap-2">
          <Search size={16} className="text-gray-400" />
          {value ? (
            <span className="text-sm">{value}</span>
          ) : (
            <span className="text-sm text-gray-400">请选择或搜索国家</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* 下拉列表 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* 搜索框 */}
          <div className="p-2 border-b">
            <input
              ref={inputRef}
              type="text"
              className="w-full px-2 py-1 text-sm border-0 focus:outline-none"
              placeholder="输入国家名称搜索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
            />
          </div>

          {/* 国家列表 */}
          <div ref={listRef} className="overflow-y-auto max-h-48">
            {filteredCountries.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                未找到匹配的国家
              </div>
            ) : (
              filteredCountries.map((country) => (
                <div
                  key={country}
                  data-selected={value === country}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 flex items-center justify-between ${
                    value === country ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                  onClick={() => handleSelect(country)}
                >
                  <span>{country}</span>
                  {value === country && <Check size={16} className="text-blue-600" />}
                </div>
              ))
            )}
          </div>

          {/* 提示信息 */}
          <div className="px-3 py-1 border-t bg-gray-50 text-xs text-gray-500">
            共 {filteredCountries.length} 个国家
          </div>
        </div>
      )}
    </div>
  );
}
