const fs = require('fs-extra');
const path = require('path');

// Найти все .md файлы в текущей и вложенных дирректориях.
async function findMarkdownFiles(dir, fileList = []) {
    try {
        const files = await fs.readdir(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = await fs.stat(filePath);

            if (stat.isDirectory()) {
                if (file !== 'node_modules') {
                    await findMarkdownFiles(filePath, fileList);
                }
            } else if (file.endsWith('.md') && !file.includes('.excalidraw') && file !== 'README.md') {
                fileList.push(filePath);
            }
        }
    } catch (error) {
        console.error(`Ошибка при поиске файлов в директории ${dir}:`, error);
    }

    return fileList;
} // [end] Найти все .md файлы в текущей и вложенных дирректориях.

// Обработать содержимое .md файла.
function processMarkdown(content, filename) {    
    const headerRegex = /###### /g; // Заменить все вхождения "###### " на название файла...
    const processedContent = content.replace(headerRegex, `###### ${filename}\n`);
   
    return processedContent;  // Вернуть обработанное содержимое.
} // [end] Обработать содержимое .md файла.

// Записать объеденённое содержимое в файл...
async function writeOutputFile(content, outputPath) {
    try {
        await fs.writeFile(outputPath, content, 'utf-8');
        console.log(`Файл ${outputPath} успешно создан.`);
    } catch (error) {
        console.error(`Ошибка при записи файла ${outputPath}:`, error);
    }
} // [end] Записать объеденённое содержимое в файл.

// Копировать и переименовать файлы...
async function copyAndRenameFiles(files, outputDir) {
    try {
        await fs.ensureDir(outputDir);

        const renamedFiles = [];

        for (const file of files) {
            const relativePath = path.relative(process.cwd(), file);
            const renamedPath = relativePath
                .split(path.sep)
                .map(part => part.replace(/ /g, '_'))
                .join('__');
            const newFilePath = path.join(outputDir, renamedPath);
            
            await fs.copy(file, newFilePath);
            renamedFiles.push(newFilePath);
        }

        return renamedFiles;
    } catch (error) {
        console.error('Ошибка при копировании и переименовании файлов:', error);
    }
} // [end] Копировать и переименовать файлы..

// Удалить ненужные строки из содержимого файла...
function removeUnwantedSections(content) {
    const regex = /---[\s\S]*?## Вопросы и ответы/g;
    return content.replace(regex, '');
} // [end] Удалить ненужные строки из содержимого файла...

// Обработать тройные обратные кавычки...
function replaceTripleBackticks(content) {
    let result = '';
    let i = 0;
    let inTripleBackticks = false;

    while (i < content.length) {
        if (content.slice(i, i + 3) === '```') {
            if (inTripleBackticks) {
                result += '</code></pre>';
                inTripleBackticks = false;
            } else {
                result += '<pre><code>';
                inTripleBackticks = true;
            }
            i += 3;
        } else {
            result += content[i];
            i++;
        }
    }

    if (inTripleBackticks) {
        result += '</pre></code>';
    }

    return result;
} // [end] Обработать тройные обратные кавычки.

// Обработать одинарные обратные кавычки...
function replaceSingleBackticks(content) {
    let result = '';
    let i = 0;
    let inCodeBlock = false;

    while (i < content.length) {
        if (content.slice(i, i + 1) === '`') {
            if (inCodeBlock) {
                result += '</code>';
                inCodeBlock = false;
            } else {
                result += '<code>';
                inCodeBlock = true;
            }
            i += 1;
        } else {
            result += content[i];
            i++;
        }
    }

    if (inCodeBlock) {
        result += '</code>';
    }

    return result;
} // [end] Обработать одинарные обратные кавычки.

// Удалить перенос строки после ###### Вопрос n:...
function removeNewlineAfterQuestionHeadings(content) {
    const questionHeadingRegex = /###### Вопрос \d+:\n/g;
    return content.replace(questionHeadingRegex, match => match.trim());
} // [end] Удалить перенос строки после "###### Вопрос n:"".

// Удалить перенос строки перед **О**:...
function removeNewlineBeforeAnswer(content) {
    const answerRegex = /\n\*\*О:\*\*/g;
    return content.replace(answerRegex, '**О:**');
} // [end] Удалить перенос строки перед **О**:...

// Заменить подчеркивание в строках, начинающихся с ######...
function replaceUnderscoresInHeaders(content) {
    const headerRegex = /###### [^\n]+/g; //Найти строки начинающиеся с "######"

    return content.replace(headerRegex, match => {        
        let modified = match.replace(/__+/g, '::'); // Заменить двойные подчеркивания на двойные двоеточия        
        modified = modified.replace(/_+/g, ' '); // Заменить одинарные подчеркивания на пробелы

        return modified;
    });
} // [end] Заменить подчеркивание в строках, начинающихся с ######.

// Удалить последнее двойное двоеточие и всего после него, если строка начинается с ######...
function removeLastDoubleColonInHeaders(content) {
    const headerRegex = /###### [^\n]+/g; // Найти строки начинающиеся с "######".

    return content.replace(headerRegex, match => {       
        const lastDoubleColonIndex = match.lastIndexOf('::'); // Найти последнее двойное двоеточие и всё что после него.        
        if (lastDoubleColonIndex !== -1) {            
            return match.substring(0, lastDoubleColonIndex); // Найти индекс после последнего двойного двоеточия.
        }
        return match; // Если нет двойного двоеточия, вернуть исходную строку.
    });
} // [end] Удалить последнее двойное двоеточие и всего после него, если строка начинается с ######.

// Заменить перенос строки на табуляцию в строках, начинающихся с "######" и добавить кавычки.
function replaceNewlineWithTabInHeaders(content) {
    // Регулярное выражение для нахождения строк, начинающихся с "######"
    const headerRegex = /(^######[^\n]+)(\n)/gm; // Найти строки начинающиеся с "######".

    return content.replace(headerRegex, (match, p1) => {
        // Заменяем перенос строки на табуляцию и добавляем кавычки
        return `${p1}\t"`;
    });
} // [end] Заменить перенос строки на табуляцию в строках, начинающихся с "######" и добавить кавычки.

// Удалить строку, начинающуюся с "**В:** "...
function removeQuestionPrefix(content) {
    const questionPrefixRegex = /^\*\*В:\*\* /gm; // Найти строки начинающиеся с "**В:** ".

    return content.replace(questionPrefixRegex, '');
} // Удалить строку, начинающуюся с "**В:** ".

// Заменить "**О:**" на кавычки, табуляцию, кавычки...
function replaceOWithQuotesAndTab(content) {
    const oRegex = /\*\*О:\*\*\s*/g; // Найти "**О:**" с пробелом после

    return content.replace(oRegex, '"\t"'); // Заменить "**О:**" на кавычки, табуляцию, кавычки.
} // [end] Заменить "**О:**" на кавычки, табуляцию, кавычки.

// Вставить кавычки в конец непустых строк перед строками, начинающимися с "######"...
function insertQuotesBeforeHeader(content) {
    // Регулярное выражение для нахождения строк, начинающихся с "######"
    const headerRegex = /^(######[^\n]*)/gm;    
    const nonEmptyLineBeforeHeaderRegex = /^(.*[^\s])\s*\n(?=######)/gm; // Найти непустые строки перед строкой "######".

    let modifiedContent = content.replace(nonEmptyLineBeforeHeaderRegex, '$1"\n'); // Заменить найденные непустые строки, добавляя кавычки

    return modifiedContent;
} // [end] Вставить кавычки в конец непустых строк перед строками, начинающимися с "######"...

// Функция для вставки кавычек в конец непустых строк перед строками, начинающимися с "######"
function insertQuotesBeforeHeader(content) {
    // Регулярное выражение для нахождения строк, начинающихся с "######"
    const headerRegex = /^(######[^\n]*)/gm;

    // Регулярное выражение для нахождения непустых строк перед строкой "######"
    const nonEmptyLineBeforeHeaderRegex = /^(.*[^\s])\s*\n(?=######)/gm;

    // Замена найденных непустых строк, добавляя кавычки
    let modifiedContent = content.replace(nonEmptyLineBeforeHeaderRegex, '$1"\n');

    return modifiedContent;
}

// Заменить все строки, начинающиеся с "######" и пробела на "learn.javascript.ru" с табуляцией...
function replaceHeaderWithUrl(content) {
    const headerRegex = /^######\s+/gm; // Найти строки, начинающиеся с "###### " (включая пробел после "######").

    return content.replace(headerRegex, () => {        
        return 'learn.javascript.ru(простая)\t'; // Вернуть "learn.javascript.ru" и добавить табуляцию
    });
} // [end] Заменить все строки, начинающиеся с "######" и пробела на "learn.javascript.ru" с табуляцией...

// Добавить заголовки в начало доукмента и удалить пустые строки после заголовков...
function addHeadersToContent(content) {
    // Заголовки для добавления.
    const headers = `#separator:tab
#html:true
#notetype column:1
#deck column:2`;
    
    const contentWithHeaders = `${headers}\n\n${content}`; // Добавить заголовки в начало.
    return contentWithHeaders.replace(/^\s*\n+/gm, ''); // Удалить пустые строки сразу после заголовков.
} // [end] Добавить заголовки в начало доукмента и удалить пустые строки после заголовков...



// Функция постобработки = Выполнить дополнительные операции с целевым файлом...
async function postProcessing(mergedFile) {
    try {
        const content = await fs.readFile(mergedFile, 'utf-8');
        let cleanedContent = removeUnwantedSections(content);
        cleanedContent = replaceTripleBackticks(cleanedContent);
        cleanedContent = replaceSingleBackticks(cleanedContent);
        cleanedContent = removeNewlineAfterQuestionHeadings(cleanedContent);
        cleanedContent = removeNewlineBeforeAnswer(cleanedContent);
        cleanedContent = replaceUnderscoresInHeaders(cleanedContent);
        cleanedContent = removeLastDoubleColonInHeaders(cleanedContent);
        cleanedContent = replaceNewlineWithTabInHeaders(cleanedContent);
        cleanedContent = removeQuestionPrefix(cleanedContent);
        cleanedContent = replaceOWithQuotesAndTab(cleanedContent);
        cleanedContent = insertQuotesBeforeHeader(cleanedContent);
        cleanedContent = replaceHeaderWithUrl(cleanedContent);
        cleanedContent = addHeadersToContent(cleanedContent);

        await fs.writeFile(mergedFile, cleanedContent, 'utf-8');
        console.log('Файл merged.md очищен от ненужных строк и обновлен с заменой обратных кавычек.');
    } catch (error) {
        console.error('Ошибка при пост-обработке файла:', error);
    }
} // [end] Функция постобработки = Выполнить дополнительные операции с целевым файлом.

// Основная функция
async function main() {
    const baseDir = process.cwd();
    const outputDir = path.join(baseDir, 'temp');
    const mergedFile = path.join(baseDir, 'target/toAnki.txt');

    try {
        const markdownFiles = await findMarkdownFiles(baseDir);
        const renamedFiles = await copyAndRenameFiles(markdownFiles, outputDir);

        let mergedContent = '';

        for (const file of renamedFiles) {
            const content = await fs.readFile(file, 'utf-8');
            const filename = path.basename(file);
            let processedContent = processMarkdown(content, filename);
            mergedContent += processedContent + '\n\n';
        }

        await writeOutputFile(mergedContent, mergedFile);
        await postProcessing(mergedFile); // Вызвать функцию постобработки.
    } catch (error) {
        console.error('Ошибка при обработке файлов:', error);
    }
}

main(); // Вызвать основную функцию.
