import React from 'react';
import { X, RotateCcw, Sliders, Type, Palette, LayoutGrid, Check } from 'lucide-react';
import { ReaderSettings, BackgroundColorType } from '../types';
import { DEFAULT_SETTINGS } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ReaderSettings;
  onUpdateSettings: (newSettings: ReaderSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const fontColorPresets = [
    { label: '默认黑色', value: '#111827', desc: 'Default Black' },
    { label: '温和灰色', value: '#6b7280', desc: 'Mild Gray' },
    { label: '亮眼白色', value: '#f9fafb', desc: 'Bright White' },
  ];

  const bgColorOptions: { key: BackgroundColorType; label: string; previewBg: string; border: string }[] = [
    {
      key: 'transparent',
      label: '透明背景',
      previewBg: 'bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] [background-size:8px_8px] bg-white/40',
      border: 'border-dashed border-zinc-400',
    },
    {
      key: 'dark',
      label: '暗色夜间',
      previewBg: 'bg-zinc-900 text-zinc-100',
      border: 'border-zinc-800',
    },
    {
      key: 'white',
      label: '纯白明亮',
      previewBg: 'bg-white text-zinc-900',
      border: 'border-zinc-300',
    },
    {
      key: 'book',
      label: '书本羊皮纸',
      previewBg: 'bg-[#f4ecd8] text-[#2c2214]',
      border: 'border-[#dfd3b8]',
    },
  ];

  return (
    <div
      id="settings-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 md:p-8 animate-fadeIn overflow-hidden"
    >
      <div
        id="settings-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-md max-h-[calc(100%-2.5rem)] sm:max-h-[calc(100%-3.5rem)] bg-white rounded-2xl shadow-2xl border border-zinc-200/90 overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-b border-zinc-100 bg-zinc-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900">阅读排版与外观设置</h2>
              <p className="text-xs text-zinc-500">自定义字体、字号、间距及背景显示</p>
            </div>
          </div>
          <button
            type="button"
            id="settings-close-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* 1. 字体大小 */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-900 flex items-center gap-1.5">
                <Type className="w-4 h-4 text-zinc-600" />
                <span>字体大小</span>
              </label>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-semibold">
                {settings.fontSize} px
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400">小 (12)</span>
              <input
                type="range"
                min="12"
                max="36"
                step="1"
                value={settings.fontSize}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, fontSize: Number(e.target.value) })
                }
                className="flex-1 accent-zinc-900 h-2 bg-zinc-200 rounded-lg cursor-pointer"
              />
              <span className="text-xs text-zinc-400">大 (36)</span>
            </div>

            {/* Quick size presets */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[
                { size: 14, label: '小 (14)' },
                { size: 16, label: '标准 (16)' },
                { size: 20, label: '适中 (20)' },
                { size: 24, label: '大字 (24)' },
              ].map((item) => (
                <button
                  key={item.size}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, fontSize: item.size })}
                  className={`py-1.5 text-xs rounded-lg border font-medium transition-all ${
                    settings.fontSize === item.size
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                      : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. 行间距 */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-900 flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4 text-zinc-600" />
                <span>行间距</span>
              </label>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-semibold">
                {settings.lineHeight.toFixed(2)}x
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400">紧凑 (1.2)</span>
              <input
                type="range"
                min="1.2"
                max="2.6"
                step="0.1"
                value={settings.lineHeight}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, lineHeight: Number(e.target.value) })
                }
                className="flex-1 accent-zinc-900 h-2 bg-zinc-200 rounded-lg cursor-pointer"
              />
              <span className="text-xs text-zinc-400">疏朗 (2.6)</span>
            </div>

            {/* Quick line height presets */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                { val: 1.4, label: '紧凑 (1.4x)' },
                { val: 1.8, label: '舒适 (1.8x)' },
                { val: 2.2, label: '宽松 (2.2x)' },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, lineHeight: item.val })}
                  className={`py-1.5 text-xs rounded-lg border font-medium transition-all ${
                    Math.abs(settings.lineHeight - item.val) < 0.05
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                      : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. 字体颜色 */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-900 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-zinc-600" />
                <span>字体颜色</span>
              </label>
              <span className="text-xs text-zinc-500 font-mono">
                {settings.fontColor.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {fontColorPresets.map((preset) => {
                const isSelected = settings.fontColor.toLowerCase() === preset.value.toLowerCase();
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() =>
                      onUpdateSettings({ ...settings, fontColor: preset.value })
                    }
                    className={`py-2 px-3 rounded-xl border flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900/10'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border border-zinc-300 shadow-xs shrink-0"
                        style={{ backgroundColor: preset.value }}
                      />
                      <span className="text-xs font-medium text-zinc-800">{preset.label}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-zinc-900" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Color Picker */}
            <div className="pt-1.5 flex items-center justify-between p-3 rounded-xl border border-zinc-200 bg-zinc-50/50">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="custom-color-input"
                  className="cursor-pointer relative flex items-center gap-2"
                >
                  <input
                    id="custom-color-input"
                    type="color"
                    value={settings.fontColor}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, fontColor: e.target.value })
                    }
                    className="w-7 h-7 rounded-lg border border-zinc-300 p-0.5 cursor-pointer bg-white"
                  />
                  <div>
                    <div className="text-xs font-medium text-zinc-800">自定义字体颜色</div>
                    <div className="text-[11px] text-zinc-400">点击调色盘或输入十六进制值</div>
                  </div>
                </label>
              </div>

              <input
                type="text"
                value={settings.fontColor}
                maxLength={7}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('#') || val.length === 0) {
                    onUpdateSettings({ ...settings, fontColor: val });
                  } else {
                    onUpdateSettings({ ...settings, fontColor: '#' + val });
                  }
                }}
                className="w-24 px-2 py-1 text-xs font-mono uppercase bg-white border border-zinc-300 rounded-lg text-center text-zinc-800 focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* 4. 背景颜色 */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-900 flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4 text-zinc-600" />
                <span>背景颜色</span>
              </label>
              <span className="text-xs text-zinc-500">
                {settings.bgColor === 'transparent' && '当前: 透明背景'}
                {settings.bgColor === 'dark' && '当前: 暗色模式'}
                {settings.bgColor === 'white' && '当前: 白色模式'}
                {settings.bgColor === 'book' && '当前: 书本羊皮纸'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {bgColorOptions.map((opt) => {
                const isSelected = settings.bgColor === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      // Smart contrast adjustment: if switching to dark, suggest white font if current is black
                      let newFontColor = settings.fontColor;
                      if (opt.key === 'dark' && settings.fontColor === '#111827') {
                        newFontColor = '#f9fafb';
                      } else if (
                        (opt.key === 'white' || opt.key === 'book') &&
                        settings.fontColor === '#f9fafb'
                      ) {
                        newFontColor = '#111827';
                      }

                      onUpdateSettings({
                        ...settings,
                        bgColor: opt.key,
                        fontColor: newFontColor,
                      });
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isSelected
                        ? 'ring-2 ring-zinc-900 border-zinc-900 shadow-xs'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-lg shadow-xs border ${opt.border} ${opt.previewBg} flex items-center justify-center text-[10px] font-bold`}
                      >
                        Aa
                      </div>
                      <span className="text-xs font-medium text-zinc-800">{opt.label}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-zinc-900" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-t border-zinc-100 bg-zinc-50/80">
          <button
            type="button"
            onClick={() => onUpdateSettings(DEFAULT_SETTINGS)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>恢复默认设置</span>
          </button>

          <button
            type="button"
            id="settings-confirm-btn"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors shadow-sm"
          >
            完成设置
          </button>
        </div>
      </div>
    </div>
  );
};
