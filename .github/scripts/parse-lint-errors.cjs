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
    
    // コンソール形式のエラーを抽出（[ERROR] や [WARN] で始まる行）
    // 複数行にまたがる情報を正しく抽出するため、ブロック単位で解析
    // エスケープシーケンスを除去
    const cleanContent = content.replace(/\x1b\[[0-9;]*m/g, '');
    const consoleErrorBlocks = cleanContent.match(/\[(ERROR|WARN|INFO)\][^\[]+(?=\n\[(?:ERROR|WARN|INFO)\]|$)/g) || [];
    const consoleErrors = new Map(); // トークン名をキーにして重複を避ける
    
    for (const block of consoleErrorBlocks) {
      // 重要度を抽出
      const severityMatch = block.match(/\[(ERROR|WARN|INFO)\]/);
      if (!severityMatch) continue;
      
      const severity = severityMatch[1].toLowerCase();
      
      // ルール名を抽出
      const ruleMatch = block.match(/\[(?:ERROR|WARN|INFO)\]\s+([^:]+):/);
      const rule = ruleMatch ? ruleMatch[1].trim() : null;
      
      // メッセージを抽出（最初の行）
      const messageMatch = block.match(/\[(?:ERROR|WARN|INFO)\]\s+[^:]+:\s*(.+?)(?:\n|$)/);
      const message = messageMatch ? messageMatch[1].trim() : null;
      
      // トークン名を抽出（複数のパターンに対応）
      let tokenName = null;
      const tokenPatterns = [
        /Token name\s+"([^"]+)"/,
        /トークン[:\s]+([^\n\s]+)/,
      ];
      
      for (const pattern of tokenPatterns) {
        const tokenMatch = block.match(pattern);
        if (tokenMatch) {
          tokenName = tokenMatch[1].trim();
          break;
        }
      }
      
      // 提案を抽出
      const suggestionMatch = block.match(/提案[:\s]+([^\n]+)/);
      const suggestion = suggestionMatch ? suggestionMatch[1].trim() : null;
      
      if (rule && (tokenName || message)) {
        const key = `${rule}:${tokenName || message}`;
        if (!consoleErrors.has(key)) {
          consoleErrors.set(key, {
            file: 'tokens.json',
            line: null,
            severity: severity === 'error' ? 'error' : severity === 'warn' ? 'warning' : 'info',
            message: message || (tokenName ? `Token name "${tokenName}" does not match pattern` : 'エラーが検出されました'),
            rule: rule,
            token: tokenName,
            suggestion: suggestion,
          });
        }
      }
    }
    
    // マークダウン形式のエラーを抽出
    const lines = content.split('\n');
    let currentFile = 'tokens.json'; // デフォルトはtokens.json
    let currentSeverity = null;
    let currentRule = null;
    let currentMessage = null;
    let currentToken = null;
    let currentSuggestion = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      // ファイルパスの検出（#### で始まる行）
      const fileMatch = line.match(/^####\s+[📄\s]*(.+?)$/);
      if (fileMatch) {
        const fileName = fileMatch[1].trim();
        if (fileName !== 'Unknown' && fileName.match(/\.(tsx?|css|jsx?|json)$/)) {
          currentFile = fileName;
        }
        continue;
      }
      
      // エラー/警告/情報の検出（❌, ⚠️, ℹ️ で始まる行）
      const severityMatch = line.match(/^(❌|⚠️|ℹ️)\s+\*\*([^*]+)\*\*/);
      if (severityMatch) {
        const icon = severityMatch[1];
        currentRule = severityMatch[2].trim();
        currentSeverity = icon === '❌' ? 'error' : icon === '⚠️' ? 'warning' : 'info';
        currentMessage = null;
        currentToken = null;
        currentSuggestion = null;
        continue;
      }
      
      // 問題、理由、提案の抽出
      if (currentRule) {
        const problemMatch = line.match(/^-\s+\*\*問題\*\*:\s*(.+)$/);
        if (problemMatch) {
          currentMessage = problemMatch[1].trim();
          continue;
        }
        
        const suggestionMatch = line.match(/^-\s+\*\*提案\*\*:\s*(.+)$/);
        if (suggestionMatch) {
          currentSuggestion = suggestionMatch[1].trim();
          // この時点でエラーを追加
          const tokenMatch = currentMessage ? currentMessage.match(/`([^`]+)`/) : null;
          const token = tokenMatch ? tokenMatch[1] : null;
          
          errors.push({
            file: currentFile,
            line: null,
            severity: currentSeverity,
            message: currentMessage || currentRule,
            rule: currentRule,
            token: token || currentToken,
            suggestion: currentSuggestion,
          });
          
          // リセット
          currentRule = null;
          currentMessage = null;
          currentToken = null;
          currentSuggestion = null;
          continue;
        }
        
        // 提案行がない場合でも、トークン名があれば追加
        const tokenMatch = line.match(/`([^`]+)`/);
        if (tokenMatch && currentRule && !currentToken) {
          currentToken = tokenMatch[1];
        }
      }
    }
    
    // コンソール形式のエラーも追加（重複を避ける）
    for (const [key, error] of consoleErrors) {
      const exists = errors.find(e => 
        e.rule === error.rule && 
        e.token === error.token &&
        e.file === error.file
      );
      if (!exists) {
        errors.push(error);
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
    markdown += '| 重要度 | ルール | トークン/問題 | メッセージ | 提案 |\n';
    markdown += '|--------|--------|--------------|------------|------|\n';
    
    for (const err of fileErrors) {
      const severity = (err.severity || 'error').toLowerCase();
      const severityIcon = severity.includes('error') ? '❌' : severity.includes('warn') ? '⚠️' : 'ℹ️';
      const severityLabel = severity.includes('error') ? 'エラー' : severity.includes('warn') ? '警告' : '情報';
      const rule = err.rule || '-';
      const token = err.token ? `\`${err.token}\`` : '-';
      let message = (err.message || 'エラーが検出されました');
      // メッセージが長すぎる場合は切り詰める
      if (message.length > 100) {
        message = message.substring(0, 97) + '...';
      }
      message = message.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      const suggestion = err.suggestion ? err.suggestion.replace(/\|/g, '\\|').replace(/\n/g, ' ') : '-';
      
      markdown += `| ${severityIcon} ${severityLabel} | ${rule} | ${token} | ${message} | ${suggestion} |\n`;
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

