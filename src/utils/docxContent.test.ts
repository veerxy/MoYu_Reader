import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { convertDocxToHtml } from './docxContent';
import { extractDocxOutlineFromHtml } from './docxOutline';

/** 构造最小可用 .docx，避免测试依赖仓库外的二进制 fixture。 */
async function createTestDocx(paragraphXml: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
      '<Default Extension="xml" ContentType="application/xml"/>',
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>',
      '</Types>',
    ].join(''),
  );
  zip.file(
    '_rels/.rels',
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>',
      '</Relationships>',
    ].join(''),
  );
  zip.file(
    'word/document.xml',
    [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      '<w:body>',
      paragraphXml,
      '</w:body>',
      '</w:document>',
    ].join(''),
  );

  return zip.generateAsync({ type: 'arraybuffer' });
}

test('DOCX 会被转换成可渲染的 HTML', async () => {
  const docx = await createTestDocx(
    '<w:p><w:r><w:t>第一段正文</w:t></w:r></w:p>',
  );
  const html = await convertDocxToHtml(docx);

  assert.equal(html.includes('第一段正文'), true);
});

test('DOCX HTML 会提取标题作为目录并保留层级', () => {
  const items = extractDocxOutlineFromHtml(
    '<p>正文</p><h1><strong>第一章</strong> 开始</h1><h2>第二节</h2>',
  );

  assert.equal(items.length, 2);
  assert.deepEqual(items[0], {
    id: 'docx-outline-0',
    title: '第一章 开始',
    level: 0,
    paragraphIndex: 0,
  });
  assert.deepEqual(items[1], {
    id: 'docx-outline-1',
    title: '第二节',
    level: 1,
    paragraphIndex: 1,
  });
});

test('DOCX HTML 没有标题时目录为空', () => {
  assert.deepEqual(extractDocxOutlineFromHtml('<p>只有正文</p>'), []);
});
