// 第一个App脚本 - The First App JavaScript

// 计算器功能 Calculator Function
function calculate() {
    const num1 = parseFloat(document.getElementById('num1').value);
    const num2 = parseFloat(document.getElementById('num2').value);
    const operation = document.getElementById('operation').value;
    const resultDiv = document.getElementById('result');

    // 验证输入 Validate input
    if (isNaN(num1) || isNaN(num2)) {
        resultDiv.innerHTML = '<span style="color: #dc3545;">请输入有效数字<br>Please enter valid numbers</span>';
        return;
    }

    let result;
    let operationSymbol;

    switch (operation) {
        case '+':
            result = num1 + num2;
            operationSymbol = '+';
            break;
        case '-':
            result = num1 - num2;
            operationSymbol = '-';
            break;
        case '*':
            result = num1 * num2;
            operationSymbol = '×';
            break;
        case '/':
            if (num2 === 0) {
                resultDiv.innerHTML = '<span style="color: #dc3545;">除数不能为零<br>Cannot divide by zero</span>';
                return;
            }
            result = num1 / num2;
            operationSymbol = '÷';
            break;
        default:
            resultDiv.innerHTML = '<span style="color: #dc3545;">无效操作<br>Invalid operation</span>';
            return;
    }

    // 格式化结果 Format result
    const formattedResult = Number.isInteger(result) ? result : result.toFixed(2);
    
    resultDiv.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 1.1em; margin-bottom: 0.5rem;">
                ${num1} ${operationSymbol} ${num2} = <strong>${formattedResult}</strong>
            </div>
            <div style="font-size: 0.9em; color: #6c757d;">
                结果 Result: ${formattedResult}
            </div>
        </div>
    `;
}

// 文本统计功能 Text Count Function
function countText() {
    const text = document.getElementById('inputText').value;
    const resultDiv = document.getElementById('textResult');

    const charCount = text.length;
    const charCountNoSpaces = text.replace(/\s/g, '').length;
    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const lineCount = text.split('\n').length;

    resultDiv.innerHTML = `字符统计 Text Statistics:
字符数 Characters: ${charCount}
无空格字符数 Characters (no spaces): ${charCountNoSpaces}
单词数 Words: ${wordCount}
行数 Lines: ${lineCount}`;
}

// 反转文本功能 Reverse Text Function
function reverseText() {
    const text = document.getElementById('inputText').value;
    const resultDiv = document.getElementById('textResult');

    if (text.trim() === '') {
        resultDiv.innerHTML = '请输入文本\nPlease enter text';
        return;
    }

    const reversedText = text.split('').reverse().join('');
    
    resultDiv.innerHTML = `反转文本 Reversed Text:
${reversedText}`;
}

// 大写文本功能 Uppercase Text Function
function uppercaseText() {
    const text = document.getElementById('inputText').value;
    const resultDiv = document.getElementById('textResult');

    if (text.trim() === '') {
        resultDiv.innerHTML = '请输入文本\nPlease enter text';
        return;
    }

    const uppercaseText = text.toUpperCase();
    const lowercaseText = text.toLowerCase();
    
    resultDiv.innerHTML = `文本转换 Text Conversion:

大写 UPPERCASE:
${uppercaseText}

小写 lowercase:
${lowercaseText}`;
}

// 页面加载完成后的初始化 Page Load Initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('第一个App已加载 - The First App Loaded');
    
    // 为计算器输入框添加回车键支持 Add Enter key support for calculator
    const calculatorInputs = document.querySelectorAll('#num1, #num2');
    calculatorInputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculate();
            }
        });
    });

    // 为文本框添加实时字符统计 Add real-time character count for text area
    const textArea = document.getElementById('inputText');
    textArea.addEventListener('input', function() {
        const charCount = this.value.length;
        // 在占位符中显示字符数 Show character count in placeholder
        if (charCount > 0) {
            this.setAttribute('data-count', `字符数: ${charCount}`);
        }
    });

    // 显示欢迎消息 Show welcome message
    setTimeout(() => {
        console.log('欢迎使用第一个App原始版本! Welcome to The First App Original Version!');
    }, 1000);
});