#!/usr/bin/env node

/**
 * design-ai-linterの出力からエラー情報を抽出し、PRコメント用に整形するスクリプト
 */

const fs = require('fs');
const path = require('path');

/**
 * JSON形式のレポートからエラー情報を抽出
 */
function parseJsonReport(jsonPath) {
  try {
    const content = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(content);
    
    // 様々なJSON構造に対応
    if (Array.isArray(data)) {
      return data;
    } else if (data.errors) {
      return data.errors;
    } else if (data.issues) {
      return data.issues;
    } else if (data.results) {
      return data.results;
    }
    
    return [];
  } catch (error) {
    console.error(`JSONレポートの読み込みに失敗しました: ${error.message}`);
    return null;
  }
}

/**
 * マークダウン形式のレポートからエラー情報を抽出
 */
function parseMarkdownReport(mdPath) {
  try {
    const content = fs.readFileSync(mdPath, 'utf8');
    const errors = [];
    
    // マークダウンのパターンを解析
    // ファイルパス、行番号、エラーメッセージを抽出
    const filePattern = /^##?\s+(.+?\.(?:tsx?|css|jsx?|json))$/;
    const errorLinePattern = /^[-*]\s*(Error|Warning|Info|エラー|警告|情報)[:\s]+(.+?)(?:at\s+line\s+(\d+)|行\s+(\d+))?/i;
    const linePattern = /(?:line|行)\s*(\d+)/i;
    
    let currentFile = null;
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      // ファイルパスの検出（## で始まる行）
      const fileMatch = line.match(filePattern);
      if (fileMatch && fileMatch[1]) {
        currentFile = fileMatch[1].trim();
        continue;
      }
      
      // エラーメッセージの検出（- で始まる行）
      if (currentFile && line.trim().startsWith('-')) {
        // Error: または Warning: で始まる行を検出
        const errorMatch = line.match(/^[-*]\s*(Error|Warning|Info|エラー|警告|情報)[:\s]+(.+?)(?:\.|$)/i);
        if (errorMatch) {
          const severity = errorMatch[1].toLowerCase();
          let message = errorMatch[2].trim();
          
          // 行番号を抽出
          const lineMatch = line.match(linePattern);
          const lineNumber = lineMatch ? parseInt(lineMatch[1]) : null;
          
          // ルール名を抽出
          const rule = extractRuleName(line);
          
          errors.push({
            file: currentFile,
            line: lineNumber,
            severity: severity.includes('error') || severity.includes('エラー') ? 'error' : 
                     severity.includes('warn') || severity.includes('警告') ? 'warning' : 'info',
            message: message,
            rule: rule,
          });
        }
      }
    }
    
    // より詳細なパターンマッチング（バッククォートやリンク形式）
    const detailedPattern = /(?:`|\[)(.+?\.(?:tsx?|css|jsx?|json))(?::(\d+))?(?::(\d+))?[`\]]/g;
    let match;
    while ((match = detailedPattern.exec(content)) !== null) {
      const [, file, line, column] = match;
      if (!file) continue;
      
      const contextStart = Math.max(0, match.index - 200);
      const contextEnd = Math.min(content.length, match.index + 200);
      const context = content.substring(contextStart, contextEnd);
      
      // エラーメッセージを抽出
      const messageMatch = context.match(/(?:Error|Warning|エラー|警告)[:\s]+(.+?)(?:\.|$)/i);
      
      if (!errors.find(e => e.file === file.trim() && e.line === (line ? parseInt(line) : null))) {
        errors.push({
          file: file.trim(),
          line: line ? parseInt(line) : null,
          column: column ? parseInt(column) : null,
          severity: context.match(/error/i) ? 'error' : context.match(/warning|warn/i) ? 'warning' : 'info',
          message: messageMatch && messageMatch[1] ? messageMatch[1].trim() : 'エラーが検出されました',
          rule: extractRuleName(context || ''),
        });
      }
    }
    
    return errors;
  } catch (error) {
    console.error(`マークダウンレポートの読み込みに失敗しました: ${error.message}`);
    console.error(error.stack);
    return null;
  }
}

/**
 * ルール名を抽出
 */
function extractRuleName(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }
  
  const rulePatterns = [
    /(?:rule|ルール)[:\s]+([a-z-]+)/i,
    /(naming-convention|raw-values|duplicates|ai-naming-consistency|ai-spacing-consistency|ai-design-complexity)/i,
  ];
  
  for (const pattern of rulePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * エラー情報をファイルごとにグループ化
 */
function groupErrorsByFile(errors) {
  const grouped = {};
  
  for (const error of errors) {
    const file = error.file || 'unknown';
    if (!grouped[file]) {
      grouped[file] = [];
    }
    grouped[file].push(error);
  }
  
  return grouped;
}

/**
 * エラー情報をPRコメント用のマークダウンに整形
 */
function formatErrorsForPR(errors) {
  if (!errors || errors.length === 0) {
    return {
      hasErrors: false,
      markdown: '## ✅ Design AI Linter Report\n\nエラーと警告は検出されませんでした。',
    };
  }
  
  const grouped = groupErrorsByFile(errors);
  const severityCounts = {
    error: 0,
    warning: 0,
    info: 0,
  };
  
  errors.forEach(err => {
    const severity = (err.severity || 'error').toLowerCase();
    if (severity.includes('error')) {
      severityCounts.error++;
    } else if (severity.includes('warn')) {
      severityCounts.warning++;
    } else {
      severityCounts.info++;
    }
  });
  
  let markdown = '## 🔍 Design AI Linter Report\n\n';
  
  // サマリー
  markdown += '### サマリー\n\n';
  markdown += `- ❌ **エラー**: ${severityCounts.error}件\n`;
  markdown += `- ⚠️ **警告**: ${severityCounts.warning}件\n`;
  markdown += `- ℹ️ **情報**: ${severityCounts.info}件\n\n`;
  
  // ファイルごとのエラー・警告詳細
  markdown += '### 検出された問題\n\n';
  
  for (const [file, fileErrors] of Object.entries(grouped)) {
    markdown += `#### \`${file}\`\n\n`;
    markdown += '| 行 | 重要度 | ルール | メッセージ |\n';
    markdown += '|----|--------|--------|------------|\n';
    
    for (const err of fileErrors) {
      const line = err.line ? `${err.line}` : '-';
      const severity = (err.severity || 'error').toLowerCase();
      const severityIcon = severity.includes('error') ? '❌' : severity.includes('warn') ? '⚠️' : 'ℹ️';
      const severityLabel = severity.includes('error') ? 'エラー' : severity.includes('warn') ? '警告' : '情報';
      const rule = err.rule || '-';
      const message = (err.message || 'エラーが検出されました').replace(/\|/g, '\\|');
      
      markdown += `| ${line} | ${severityIcon} ${severityLabel} | ${rule} | ${message} |\n`;
    }
    
    markdown += '\n';
  }
  
  // エラーまたは警告がある場合はtrue
  const hasIssues = severityCounts.error > 0 || severityCounts.warning > 0 || severityCounts.info > 0;
  
  return {
    hasErrors: hasIssues,
    markdown,
    errors,
    summary: severityCounts,
  };
}

/**
 * メイン処理
 */
function main() {
  const reportsDir = process.argv[2] || './reports';
  const outputPath = process.argv[3] || path.join(reportsDir, 'pr-comment.md');
  
  // JSON形式のレポートを優先的に読み込む
  const jsonReportPath = path.join(reportsDir, 'lint-report.json');
  const mdReportPath = path.join(reportsDir, 'lint-report.md');
  
  let errors = null;
  
  // JSON形式のレポートを試す
  if (fs.existsSync(jsonReportPath)) {
    console.log('JSON形式のレポートを読み込み中...');
    errors = parseJsonReport(jsonReportPath);
  }
  
  // JSONが無い、またはパースに失敗した場合はマークダウンを試す
  if (!errors || errors.length === 0) {
    if (fs.existsSync(mdReportPath)) {
      console.log('マークダウン形式のレポートを読み込み中...');
      const mdErrors = parseMarkdownReport(mdReportPath);
      if (mdErrors && mdErrors.length > 0) {
        errors = mdErrors;
      }
    }
  }
  
  // エラー情報を整形
  const result = formatErrorsForPR(errors || []);
  
  // 出力
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, result.markdown, 'utf8');
  
  // JSON形式でも出力（ワークフローで使用）
  const jsonOutputPath = path.join(reportsDir, 'errors.json');
  fs.writeFileSync(jsonOutputPath, JSON.stringify(result, null, 2), 'utf8');
  
  console.log(`PRコメント用のマークダウンを生成しました: ${outputPath}`);
  console.log(`エラー情報のJSONを生成しました: ${jsonOutputPath}`);
  
  // エラーがある場合は非ゼロの終了コードを返す
  if (result.hasErrors) {
    process.exit(1);
  }
  
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseJsonReport,
  parseMarkdownReport,
  formatErrorsForPR,
  groupErrorsByFile,
};

