const UTF8_BOM = [0xef, 0xbb, 0xbf];
const UTF16_LE_BOM = [0xff, 0xfe];
const UTF16_BE_BOM = [0xfe, 0xff];

function startsWith(bytes: Uint8Array, bom: number[]): boolean {
  if (bytes.length < bom.length) return false;

  return bom.every((byte, index) => bytes[index] === byte);
}

/**
 * 解码 TXT 文件内容。
 *
 * 顺序要求：
 * 1. 有 BOM 的文件必须按 BOM 指定的编码解码，否则 UTF-16 会被 GB18030 误读成乱码。
 * 2. 无 BOM 时先严格尝试 UTF-8，失败后再回退 GB18030，兼容常见中文小说编码。
 */
export function decodeTxtContent(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length === 0) return '';

  if (startsWith(bytes, UTF16_LE_BOM)) {
    return new TextDecoder('utf-16le').decode(bytes);
  }

  if (startsWith(bytes, UTF16_BE_BOM)) {
    return new TextDecoder('utf-16be').decode(bytes);
  }

  if (startsWith(bytes, UTF8_BOM)) {
    return new TextDecoder('utf-8').decode(bytes);
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    // GB18030 覆盖 GBK / GB2312，是中文 TXT 的常用兜底编码。
    return new TextDecoder('gb18030').decode(bytes);
  }
}