import mammoth from 'mammoth';

/**
 * 将 .docx 转为轻量 HTML。
 *
 * mammoth 的输出不包含 Word 页面底色，天然适合透明阅读模式；
 * 同时保留标题、正文、列表、表格和图片等语义内容。
 */
export async function convertDocxToHtml(buffer: ArrayBuffer): Promise<string> {
  // Node 测试环境使用 Buffer，浏览器/Tauri 环境使用 ArrayBuffer；两者输入同一个 .docx。
  const input = typeof window === 'undefined' ? { buffer: Buffer.from(buffer) } : { arrayBuffer: buffer };
  const result = await mammoth.convertToHtml(input);
  return result.value;
}
