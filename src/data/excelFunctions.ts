// Excel函数分类数据
export interface ExcelFunctionParam {
  name: string
  description: string
}

export interface ExcelFunction {
  category: string      // 分类：数学函数、文本函数、日期函数、逻辑函数、查找函数等
  name: string          // 函数名，如 "SUM"
  syntax: string        // 语法，如 "SUM(number1, [number2], ...)"
  description: string   // 功能说明
  parameters: ExcelFunctionParam[]  // 参数说明
  example: string       // 使用示例
  tip?: string          // 使用技巧
}

export const excelFunctions: ExcelFunction[] = [
  // 数学函数
  { 
    category: '数学函数', 
    name: 'SUM', 
    syntax: 'SUM(number1, [number2], ...)', 
    description: '计算一组数值的总和',
    parameters: [
      { name: 'number1', description: '第一个数值或范围，必需' },
      { name: 'number2', description: '额外的数值或范围，可选，最多255个' }
    ],
    example: '=SUM(A1:A10) 或 =SUM(1,2,3,4,5)', 
    tip: '可选中整列或整行快速求和，也可用Alt+=快速插入SUM函数' 
  },
  { 
    category: '数学函数', 
    name: 'SUMIF', 
    syntax: 'SUMIF(range, criteria, [sum_range])', 
    description: '对满足条件的单元格求和',
    parameters: [
      { name: 'range', description: '要应用条件的单元格范围' },
      { name: 'criteria', description: '条件，如">10"、"苹果"、"*果"' },
      { name: 'sum_range', description: '实际求和的范围，如省略则对range求和' }
    ],
    example: '=SUMIF(A1:A10,">100") 或 =SUMIF(B1:B10,"苹果",C1:C10)', 
    tip: '支持通配符*和?进行模糊匹配' 
  },
  { 
    category: '数学函数', 
    name: 'SUMIFS', 
    syntax: 'SUMIFS(sum_range, criteria_range1, criteria1, [criteria_range2, criteria2], ...)', 
    description: '对满足多个条件的单元格求和',
    parameters: [
      { name: 'sum_range', description: '实际求和的范围' },
      { name: 'criteria_range1', description: '第一个条件范围' },
      { name: 'criteria1', description: '第一个条件' },
      { name: 'criteria_range2', description: '第二个条件范围，可选' },
      { name: 'criteria2', description: '第二个条件，可选' }
    ],
    example: '=SUMIFS(C1:C10,A1:A10,">100",B1:B10,"苹果")', 
    tip: '最多可设置127个条件范围/条件对' 
  },
  { 
    category: '数学函数', 
    name: 'AVERAGE', 
    syntax: 'AVERAGE(number1, [number2], ...)', 
    description: '计算一组数值的平均值',
    parameters: [
      { name: 'number1', description: '第一个数值或范围，必需' },
      { name: 'number2', description: '额外的数值或范围，可选' }
    ],
    example: '=AVERAGE(A1:A20) 或 =AVERAGE(10,20,30)', 
    tip: '忽略文本和空单元格，但包含0值' 
  },
  { 
    category: '数学函数', 
    name: 'AVERAGEIF', 
    syntax: 'AVERAGEIF(range, criteria, [average_range])', 
    description: '对满足条件的单元格计算平均值',
    parameters: [
      { name: 'range', description: '要应用条件的单元格范围' },
      { name: 'criteria', description: '条件' },
      { name: 'average_range', description: '实际计算平均值的范围' }
    ],
    example: '=AVERAGEIF(A1:A10,">50")', 
  },
  { 
    category: '数学函数', 
    name: 'COUNT', 
    syntax: 'COUNT(value1, [value2], ...)', 
    description: '计算包含数字的单元格个数',
    parameters: [
      { name: 'value1', description: '第一个值或范围，必需' },
      { name: 'value2', description: '额外的值或范围，可选' }
    ],
    example: '=COUNT(A1:A100)', 
    tip: '只计数数值型数据，不计数文本、空单元格' 
  },
  { 
    category: '数学函数', 
    name: 'COUNTA', 
    syntax: 'COUNTA(value1, [value2], ...)', 
    description: '计算非空单元格的个数',
    parameters: [
      { name: 'value1', description: '第一个值或范围，必需' },
      { name: 'value2', description: '额外的值或范围，可选' }
    ],
    example: '=COUNTA(A1:A100)', 
    tip: '计数所有非空单元格，包括文本、数值、错误值等' 
  },
  { 
    category: '数学函数', 
    name: 'COUNTIF', 
    syntax: 'COUNTIF(range, criteria)', 
    description: '计算满足条件的单元格个数',
    parameters: [
      { name: 'range', description: '要计数的范围' },
      { name: 'criteria', description: '条件' }
    ],
    example: '=COUNTIF(A1:A10,"苹果") 或 =COUNTIF(B1:B100,">50")', 
    tip: '支持通配符*和?进行模糊匹配' 
  },
  { 
    category: '数学函数', 
    name: 'COUNTIFS', 
    syntax: 'COUNTIFS(criteria_range1, criteria1, [criteria_range2, criteria2], ...)', 
    description: '计算满足多个条件的单元格个数',
    parameters: [
      { name: 'criteria_range1', description: '第一个条件范围' },
      { name: 'criteria1', description: '第一个条件' },
      { name: 'criteria_range2', description: '第二个条件范围，可选' },
      { name: 'criteria2', description: '第二个条件，可选' }
    ],
    example: '=COUNTIFS(A1:A10,"苹果",B1:B10,">10")', 
  },
  { 
    category: '数学函数', 
    name: 'MAX', 
    syntax: 'MAX(number1, [number2], ...)', 
    description: '返回一组数值中的最大值',
    parameters: [
      { name: 'number1', description: '第一个数值或范围，必需' },
      { name: 'number2', description: '额外的数值或范围，可选' }
    ],
    example: '=MAX(A1:A100)', 
  },
  { 
    category: '数学函数', 
    name: 'MIN', 
    syntax: 'MIN(number1, [number2], ...)', 
    description: '返回一组数值中的最小值',
    parameters: [
      { name: 'number1', description: '第一个数值或范围，必需' },
      { name: 'number2', description: '额外的数值或范围，可选' }
    ],
    example: '=MIN(A1:A100)', 
  },
  { 
    category: '数学函数', 
    name: 'ABS', 
    syntax: 'ABS(number)', 
    description: '返回数值的绝对值',
    parameters: [
      { name: 'number', description: '需要计算绝对值的数值' }
    ],
    example: '=ABS(-5) 返回 5', 
  },
  { 
    category: '数学函数', 
    name: 'ROUND', 
    syntax: 'ROUND(number, num_digits)', 
    description: '将数值四舍五入到指定位数',
    parameters: [
      { name: 'number', description: '需要四舍五入的数值' },
      { name: 'num_digits', description: '保留的小数位数，正数表示小数位，负数表示整数位' }
    ],
    example: '=ROUND(123.456,2) 返回 123.46，=ROUND(123.456,-1) 返回 120', 
  },
  { 
    category: '数学函数', 
    name: 'ROUNDUP', 
    syntax: 'ROUNDUP(number, num_digits)', 
    description: '向上舍入数值',
    parameters: [
      { name: 'number', description: '需要舍入的数值' },
      { name: 'num_digits', description: '保留的位数' }
    ],
    example: '=ROUNDUP(123.456,2) 返回 123.46', 
  },
  { 
    category: '数学函数', 
    name: 'ROUNDDOWN', 
    syntax: 'ROUNDDOWN(number, num_digits)', 
    description: '向下舍入数值',
    parameters: [
      { name: 'number', description: '需要舍入的数值' },
      { name: 'num_digits', description: '保留的位数' }
    ],
    example: '=ROUNDDOWN(123.456,2) 返回 123.45', 
  },
  { 
    category: '数学函数', 
    name: 'INT', 
    syntax: 'INT(number)', 
    description: '将数值向下取整为最接近的整数',
    parameters: [
      { name: 'number', description: '需要取整的数值' }
    ],
    example: '=INT(5.9) 返回 5，=INT(-5.9) 返回 -6', 
    tip: '负数向下取整会变得更小' 
  },
  { 
    category: '数学函数', 
    name: 'MOD', 
    syntax: 'MOD(number, divisor)', 
    description: '返回两数相除的余数',
    parameters: [
      { name: 'number', description: '被除数' },
      { name: 'divisor', description: '除数' }
    ],
    example: '=MOD(10,3) 返回 1', 
  },
  { 
    category: '数学函数', 
    name: 'POWER', 
    syntax: 'POWER(number, power)', 
    description: '返回数值的指定次幂',
    parameters: [
      { name: 'number', description: '底数' },
      { name: 'power', description: '指数' }
    ],
    example: '=POWER(2,3) 返回 8', 
    tip: '也可使用 ^ 运算符，如 2^3' 
  },
  { 
    category: '数学函数', 
    name: 'SQRT', 
    syntax: 'SQRT(number)', 
    description: '返回数值的平方根',
    parameters: [
      { name: 'number', description: '需要计算平方根的数值，必须为正数' }
    ],
    example: '=SQRT(16) 返回 4', 
  },
  { 
    category: '数学函数', 
    name: 'PRODUCT', 
    syntax: 'PRODUCT(number1, [number2], ...)', 
    description: '计算一组数值的乘积',
    parameters: [
      { name: 'number1', description: '第一个数值或范围' },
      { name: 'number2', description: '额外的数值或范围，可选' }
    ],
    example: '=PRODUCT(A1:A5)', 
  },
  
  // 文本函数
  { 
    category: '文本函数', 
    name: 'LEFT', 
    syntax: 'LEFT(text, [num_chars])', 
    description: '从文本左侧提取指定数量的字符',
    parameters: [
      { name: 'text', description: '源文本' },
      { name: 'num_chars', description: '要提取的字符数，默认为1' }
    ],
    example: '=LEFT("Hello World",5) 返回 "Hello"', 
  },
  { 
    category: '文本函数', 
    name: 'RIGHT', 
    syntax: 'RIGHT(text, [num_chars])', 
    description: '从文本右侧提取指定数量的字符',
    parameters: [
      { name: 'text', description: '源文本' },
      { name: 'num_chars', description: '要提取的字符数，默认为1' }
    ],
    example: '=RIGHT("Hello World",5) 返回 "World"', 
  },
  { 
    category: '文本函数', 
    name: 'MID', 
    syntax: 'MID(text, start_num, num_chars)', 
    description: '从文本中间提取指定数量的字符',
    parameters: [
      { name: 'text', description: '源文本' },
      { name: 'start_num', description: '开始位置（从1开始）' },
      { name: 'num_chars', description: '要提取的字符数' }
    ],
    example: '=MID("Hello World",7,5) 返回 "World"', 
  },
  { 
    category: '文本函数', 
    name: 'LEN', 
    syntax: 'LEN(text)', 
    description: '返回文本字符串的长度',
    parameters: [
      { name: 'text', description: '要计算长度的文本' }
    ],
    example: '=LEN("Hello") 返回 5', 
    tip: '空格也计入长度' 
  },
  { 
    category: '文本函数', 
    name: 'LOWER', 
    syntax: 'LOWER(text)', 
    description: '将文本转换为小写',
    parameters: [
      { name: 'text', description: '要转换的文本' }
    ],
    example: '=LOWER("HELLO") 返回 "hello"', 
  },
  { 
    category: '文本函数', 
    name: 'UPPER', 
    syntax: 'UPPER(text)', 
    description: '将文本转换为大写',
    parameters: [
      { name: 'text', description: '要转换的文本' }
    ],
    example: '=UPPER("hello") 返回 "HELLO"', 
  },
  { 
    category: '文本函数', 
    name: 'PROPER', 
    syntax: 'PROPER(text)', 
    description: '将文本中每个单词的首字母大写',
    parameters: [
      { name: 'text', description: '要转换的文本' }
    ],
    example: '=PROPER("hello world") 返回 "Hello World"', 
  },
  { 
    category: '文本函数', 
    name: 'TRIM', 
    syntax: 'TRIM(text)', 
    description: '删除文本中多余的空格（保留单词间单个空格）',
    parameters: [
      { name: 'text', description: '要处理的文本' }
    ],
    example: '=TRIM("  Hello  World  ") 返回 "Hello World"', 
    tip: '常用于清理导入数据中的多余空格' 
  },
  { 
    category: '文本函数', 
    name: 'CLEAN', 
    syntax: 'CLEAN(text)', 
    description: '删除文本中的非打印字符',
    parameters: [
      { name: 'text', description: '要处理的文本' }
    ],
    example: '=CLEAN(A1)', 
    tip: '常用于清理从其他系统导入的数据' 
  },
  { 
    category: '文本函数', 
    name: 'CONCATENATE', 
    syntax: 'CONCATENATE(text1, [text2], ...)', 
    description: '将多个文本字符串合并为一个',
    parameters: [
      { name: 'text1', description: '第一个文本' },
      { name: 'text2', description: '额外的文本，可选' }
    ],
    example: '=CONCATENATE("Hello"," ","World") 返回 "Hello World"', 
    tip: '也可使用 & 运算符，如 "Hello"&" "&"World"' 
  },
  { 
    category: '文本函数', 
    name: 'TEXTJOIN', 
    syntax: 'TEXTJOIN(delimiter, ignore_empty, text1, [text2], ...)', 
    description: '使用分隔符连接多个文本',
    parameters: [
      { name: 'delimiter', description: '分隔符' },
      { name: 'ignore_empty', description: '是否忽略空单元格（TRUE/FALSE）' },
      { name: 'text1', description: '第一个文本或范围' },
      { name: 'text2', description: '额外的文本或范围，可选' }
    ],
    example: '=TEXTJOIN(",",TRUE,A1:A5)', 
    tip: 'Excel 2019及以上版本可用' 
  },
  { 
    category: '文本函数', 
    name: 'SUBSTITUTE', 
    syntax: 'SUBSTITUTE(text, old_text, new_text, [instance_num])', 
    description: '在文本中替换指定内容',
    parameters: [
      { name: 'text', description: '源文本' },
      { name: 'old_text', description: '要替换的旧文本' },
      { name: 'new_text', description: '替换后的新文本' },
      { name: 'instance_num', description: '替换第几次出现的（可选，默认全部替换）' }
    ],
    example: '=SUBSTITUTE("Hello World","World","Excel") 返回 "Hello Excel"', 
  },
  { 
    category: '文本函数', 
    name: 'REPLACE', 
    syntax: 'REPLACE(old_text, start_num, num_chars, new_text)', 
    description: '根据位置和长度替换文本',
    parameters: [
      { name: 'old_text', description: '源文本' },
      { name: 'start_num', description: '开始替换的位置' },
      { name: 'num_chars', description: '要替换的字符数' },
      { name: 'new_text', description: '替换后的新文本' }
    ],
    example: '=REPLACE("Hello World",7,5,"Excel") 返回 "Hello Excel"', 
  },
  { 
    category: '文本函数', 
    name: 'FIND', 
    syntax: 'FIND(find_text, within_text, [start_num])', 
    description: '在文本中查找指定内容的位置（区分大小写）',
    parameters: [
      { name: 'find_text', description: '要查找的文本' },
      { name: 'within_text', description: '被查找的文本' },
      { name: 'start_num', description: '开始查找的位置，可选' }
    ],
    example: '=FIND("World","Hello World") 返回 7', 
    tip: '找不到时返回#VALUE!错误' 
  },
  { 
    category: '文本函数', 
    name: 'SEARCH', 
    syntax: 'SEARCH(find_text, within_text, [start_num])', 
    description: '在文本中查找指定内容的位置（不区分大小写）',
    parameters: [
      { name: 'find_text', description: '要查找的文本' },
      { name: 'within_text', description: '被查找的文本' },
      { name: 'start_num', description: '开始查找的位置，可选' }
    ],
    example: '=SEARCH("world","Hello World") 返回 7', 
    tip: '支持通配符*和?' 
  },
  { 
    category: '文本函数', 
    name: 'TEXT', 
    syntax: 'TEXT(value, format_text)', 
    description: '将数值转换为指定格式的文本',
    parameters: [
      { name: 'value', description: '数值或日期' },
      { name: 'format_text', description: '格式代码，如"0.00"、"yyyy-mm-dd"' }
    ],
    example: '=TEXT(1234.5,"0.00") 返回 "1234.50"，=TEXT(TODAY(),"yyyy年mm月dd日")', 
    tip: '常用于自定义显示格式' 
  },
  { 
    category: '文本函数', 
    name: 'VALUE', 
    syntax: 'VALUE(text)', 
    description: '将文本转换为数值',
    parameters: [
      { name: 'text', description: '要转换的文本' }
    ],
    example: '=VALUE("123") 返回 123', 
  },
  
  // 日期函数
  { 
    category: '日期函数', 
    name: 'TODAY', 
    syntax: 'TODAY()', 
    description: '返回当前日期',
    parameters: [],
    example: '=TODAY()', 
    tip: '每次打开工作表会自动更新' 
  },
  { 
    category: '日期函数', 
    name: 'NOW', 
    syntax: 'NOW()', 
    description: '返回当前日期和时间',
    parameters: [],
    example: '=NOW()', 
    tip: '包含日期和时间，每次打开工作表会自动更新' 
  },
  { 
    category: '日期函数', 
    name: 'DATE', 
    syntax: 'DATE(year, month, day)', 
    description: '根据年、月、日创建日期',
    parameters: [
      { name: 'year', description: '年份' },
      { name: 'month', description: '月份' },
      { name: 'day', description: '日' }
    ],
    example: '=DATE(2024,12,25)', 
    tip: '月份和日可以超出正常范围，会自动调整' 
  },
  { 
    category: '日期函数', 
    name: 'YEAR', 
    syntax: 'YEAR(date)', 
    description: '从日期中提取年份',
    parameters: [
      { name: 'date', description: '日期值' }
    ],
    example: '=YEAR(TODAY()) 或 =YEAR("2024-12-25")', 
  },
  { 
    category: '日期函数', 
    name: 'MONTH', 
    syntax: 'MONTH(date)', 
    description: '从日期中提取月份',
    parameters: [
      { name: 'date', description: '日期值' }
    ],
    example: '=MONTH(TODAY())', 
  },
  { 
    category: '日期函数', 
    name: 'DAY', 
    syntax: 'DAY(date)', 
    description: '从日期中提取日',
    parameters: [
      { name: 'date', description: '日期值' }
    ],
    example: '=DAY(TODAY())', 
  },
  { 
    category: '日期函数', 
    name: 'WEEKDAY', 
    syntax: 'WEEKDAY(date, [return_type])', 
    description: '返回日期对应的星期数',
    parameters: [
      { name: 'date', description: '日期值' },
      { name: 'return_type', description: '返回类型：1=1-7周日-周六，2=1-7周一-周日，3=0-6周一-周日' }
    ],
    example: '=WEEKDAY(TODAY()) 或 =WEEKDAY(TODAY(),2)', 
  },
  { 
    category: '日期函数', 
    name: 'DATEDIF', 
    syntax: 'DATEDIF(start_date, end_date, unit)', 
    description: '计算两个日期之间的差值',
    parameters: [
      { name: 'start_date', description: '开始日期' },
      { name: 'end_date', description: '结束日期' },
      { name: 'unit', description: '单位："Y"年、"M"月、"D"日、"YM"忽略年、"YD"忽略年、"MD"忽略年月' }
    ],
    example: '=DATEDIF("2024-1-1","2024-12-31","D") 返回 365', 
    tip: '隐藏函数，函数库中不显示但可用' 
  },
  { 
    category: '日期函数', 
    name: 'EDATE', 
    syntax: 'EDATE(start_date, months)', 
    description: '返回指定月数后的日期',
    parameters: [
      { name: 'start_date', description: '开始日期' },
      { name: 'months', description: '月数，正数为向后，负数为向前' }
    ],
    example: '=EDATE(TODAY(),3)', 
  },
  { 
    category: '日期函数', 
    name: 'EOMONTH', 
    syntax: 'EOMONTH(start_date, months)', 
    description: '返回指定月数后的月末日期',
    parameters: [
      { name: 'start_date', description: '开始日期' },
      { name: 'months', description: '月数' }
    ],
    example: '=EOMONTH(TODAY(),0)', 
    tip: '常用于计算月末日期或月初日期（+1再-1）' 
  },
  { 
    category: '日期函数', 
    name: 'WORKDAY', 
    syntax: 'WORKDAY(start_date, days, [holidays])', 
    description: '返回指定工作日数后的日期（排除周末和节假日）',
    parameters: [
      { name: 'start_date', description: '开始日期' },
      { name: 'days', description: '工作日数' },
      { name: 'holidays', description: '节假日日期范围，可选' }
    ],
    example: '=WORKDAY(TODAY(),10)', 
  },
  { 
    category: '日期函数', 
    name: 'NETWORKDAYS', 
    syntax: 'NETWORKDAYS(start_date, end_date, [holidays])', 
    description: '计算两个日期之间的工作日数',
    parameters: [
      { name: 'start_date', description: '开始日期' },
      { name: 'end_date', description: '结束日期' },
      { name: 'holidays', description: '节假日日期范围，可选' }
    ],
    example: '=NETWORKDAYS("2024-1-1","2024-12-31")', 
  },
  
  // 逻辑函数
  { 
    category: '逻辑函数', 
    name: 'IF', 
    syntax: 'IF(logical_test, value_if_true, [value_if_false])', 
    description: '根据条件返回不同的值',
    parameters: [
      { name: 'logical_test', description: '条件表达式' },
      { name: 'value_if_true', description: '条件为真时返回的值' },
      { name: 'value_if_false', description: '条件为假时返回的值，可选' }
    ],
    example: '=IF(A1>100,"大","小") 或 =IF(A1>60,"合格","不合格")', 
    tip: '最多嵌套64层IF' 
  },
  { 
    category: '逻辑函数', 
    name: 'IFS', 
    syntax: 'IFS(condition1, value1, [condition2, value2], ...)', 
    description: '检查多个条件并返回对应的值',
    parameters: [
      { name: 'condition1', description: '第一个条件' },
      { name: 'value1', description: '第一个条件为真时返回的值' },
      { name: 'condition2', description: '第二个条件，可选' },
      { name: 'value2', description: '第二个条件为真时返回的值，可选' }
    ],
    example: '=IFS(A1>=90,"优秀",A1>=80,"良好",A1>=60,"合格",TRUE,"不合格")', 
    tip: 'Excel 2019及以上版本可用，比嵌套IF更清晰' 
  },
  { 
    category: '逻辑函数', 
    name: 'IFERROR', 
    syntax: 'IFERROR(value, value_if_error)', 
    description: '如果公式产生错误，返回指定的值',
    parameters: [
      { name: 'value', description: '要检查的公式或值' },
      { name: 'value_if_error', description: '错误时返回的值' }
    ],
    example: '=IFERROR(VLOOKUP(A1,B:C,2,0),"未找到")', 
    tip: '捕获所有错误类型（#N/A、#VALUE!、#REF!等）' 
  },
  { 
    category: '逻辑函数', 
    name: 'IFNA', 
    syntax: 'IFNA(value, value_if_na)', 
    description: '如果公式返回#N/A错误，返回指定的值',
    parameters: [
      { name: 'value', description: '要检查的公式或值' },
      { name: 'value_if_na', description: '#N/A错误时返回的值' }
    ],
    example: '=IFNA(VLOOKUP(A1,B:C,2,0),"未找到")', 
    tip: '只捕获#N/A错误，其他错误正常显示' 
  },
  { 
    category: '逻辑函数', 
    name: 'AND', 
    syntax: 'AND(logical1, [logical2], ...)', 
    description: '检查所有条件是否都为真',
    parameters: [
      { name: 'logical1', description: '第一个条件' },
      { name: 'logical2', description: '额外的条件，可选' }
    ],
    example: '=AND(A1>0,B1>0) 或 =IF(AND(A1>60,B1>60),"全部合格","不合格")', 
  },
  { 
    category: '逻辑函数', 
    name: 'OR', 
    syntax: 'OR(logical1, [logical2], ...)', 
    description: '检查是否有任一条件为真',
    parameters: [
      { name: 'logical1', description: '第一个条件' },
      { name: 'logical2', description: '额外的条件，可选' }
    ],
    example: '=OR(A1>100,B1>100)', 
  },
  { 
    category: '逻辑函数', 
    name: 'NOT', 
    syntax: 'NOT(logical)', 
    description: '对条件结果取反',
    parameters: [
      { name: 'logical', description: '要取反的条件' }
    ],
    example: '=NOT(A1>100)', 
  },
  { 
    category: '逻辑函数', 
    name: 'TRUE', 
    syntax: 'TRUE()', 
    description: '返回逻辑值TRUE',
    parameters: [],
    example: '=TRUE()', 
  },
  { 
    category: '逻辑函数', 
    name: 'FALSE', 
    syntax: 'FALSE()', 
    description: '返回逻辑值FALSE',
    parameters: [],
    example: '=FALSE()', 
  },
  { 
    category: '逻辑函数', 
    name: 'SWITCH', 
    syntax: 'SWITCH(expression, value1, result1, [value2, result2], ..., [default])', 
    description: '根据值列表返回对应的结果',
    parameters: [
      { name: 'expression', description: '要比较的值' },
      { name: 'value1', description: '第一个比较值' },
      { name: 'result1', description: '匹配value1时返回的结果' },
      { name: 'value2', description: '第二个比较值，可选' },
      { name: 'result2', description: '匹配value2时返回的结果，可选' },
      { name: 'default', description: '没有匹配时的默认值，可选' }
    ],
    example: '=SWITCH(A1,1,"周一",2,"周二",3,"周三","其他")', 
    tip: 'Excel 2019及以上版本可用' 
  },
  
  // 查找引用函数
  { 
    category: '查找引用函数', 
    name: 'VLOOKUP', 
    syntax: 'VLOOKUP(lookup_value, table_array, col_index_num, [range_lookup])', 
    description: '垂直查找，在表格第一列查找值并返回指定列的数据',
    parameters: [
      { name: 'lookup_value', description: '要查找的值' },
      { name: 'table_array', description: '查找范围' },
      { name: 'col_index_num', description: '返回数据所在的列号（从1开始）' },
      { name: 'range_lookup', description: '匹配类型：FALSE精确匹配，TRUE近似匹配' }
    ],
    example: '=VLOOKUP(A1,B:D,2,FALSE)', 
    tip: '只能向右查找，不能向左；建议使用FALSE精确匹配' 
  },
  { 
    category: '查找引用函数', 
    name: 'HLOOKUP', 
    syntax: 'HLOOKUP(lookup_value, table_array, row_index_num, [range_lookup])', 
    description: '水平查找，在表格第一行查找值并返回指定行的数据',
    parameters: [
      { name: 'lookup_value', description: '要查找的值' },
      { name: 'table_array', description: '查找范围' },
      { name: 'row_index_num', description: '返回数据所在的行号' },
      { name: 'range_lookup', description: '匹配类型' }
    ],
    example: '=HLOOKUP(A1,A:F,2,FALSE)', 
  },
  { 
    category: '查找引用函数', 
    name: 'LOOKUP', 
    syntax: 'LOOKUP(lookup_value, lookup_vector, [result_vector])', 
    description: '在范围中查找值并返回对应位置的数据',
    parameters: [
      { name: 'lookup_value', description: '要查找的值' },
      { name: 'lookup_vector', description: '查找范围' },
      { name: 'result_vector', description: '返回结果的范围，可选' }
    ],
    example: '=LOOKUP(A1,B1:B10,C1:C10)', 
    tip: '支持向左查找，但要求查找范围已排序' 
  },
  { 
    category: '查找引用函数', 
    name: 'INDEX', 
    syntax: 'INDEX(array, row_num, [col_num]) 或 INDEX(reference, row_num, [col_num], [area_num])', 
    description: '返回指定位置的单元格值',
    parameters: [
      { name: 'array', description: '数组或范围' },
      { name: 'row_num', description: '行号' },
      { name: 'col_num', description: '列号，可选' }
    ],
    example: '=INDEX(A1:C10,5,2)', 
    tip: '常与MATCH组合使用实现灵活查找' 
  },
  { 
    category: '查找引用函数', 
    name: 'MATCH', 
    syntax: 'MATCH(lookup_value, lookup_array, [match_type])', 
    description: '返回查找值在范围中的位置',
    parameters: [
      { name: 'lookup_value', description: '要查找的值' },
      { name: 'lookup_array', description: '查找范围' },
      { name: 'match_type', description: '匹配类型：0精确匹配，1小于等于，-1大于等于' }
    ],
    example: '=MATCH("苹果",A1:A10,0)', 
    tip: '返回位置索引而非值本身' 
  },
  { 
    category: '查找引用函数', 
    name: 'XLOOKUP', 
    syntax: 'XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])', 
    description: '增强版查找函数，支持任意方向查找',
    parameters: [
      { name: 'lookup_value', description: '要查找的值' },
      { name: 'lookup_array', description: '查找范围' },
      { name: 'return_array', description: '返回范围' },
      { name: 'if_not_found', description: '未找到时返回的值，可选' },
      { name: 'match_mode', description: '匹配模式：0精确匹配，可选' },
      { name: 'search_mode', description: '搜索模式：1从头到尾，可选' }
    ],
    example: '=XLOOKUP(A1,B1:B10,C1:C10,"未找到")', 
    tip: 'Excel 2021及以上版本可用，比VLOOKUP更强大' 
  },
  { 
    category: '查找引用函数', 
    name: 'INDIRECT', 
    syntax: 'INDIRECT(ref_text, [a1])', 
    description: '返回文本字符串指定的引用',
    parameters: [
      { name: 'ref_text', description: '单元格引用的文本，如"A1"、"Sheet1!A1"' },
      { name: 'a1', description: '引用样式：TRUE为A1样式，FALSE为R1C1样式' }
    ],
    example: '=INDIRECT("A"&B1)', 
    tip: '可用于动态引用，但会影响计算性能' 
  },
  { 
    category: '查找引用函数', 
    name: 'OFFSET', 
    syntax: 'OFFSET(reference, rows, cols, [height], [width])', 
    description: '返回指定偏移位置的引用',
    parameters: [
      { name: 'reference', description: '起始引用' },
      { name: 'rows', description: '行偏移数（正数向下，负数向上）' },
      { name: 'cols', description: '列偏移数（正数向右，负数向左）' },
      { name: 'height', description: '返回范围的高度，可选' },
      { name: 'width', description: '返回范围的宽度，可选' }
    ],
    example: '=OFFSET(A1,2,3)', 
    tip: '动态引用但会影响计算性能' 
  },
  { 
    category: '查找引用函数', 
    name: 'ROW', 
    syntax: 'ROW([reference])', 
    description: '返回引用的行号',
    parameters: [
      { name: 'reference', description: '单元格或范围，可选' }
    ],
    example: '=ROW() 返回当前行号，=ROW(A5) 返回 5', 
  },
  { 
    category: '查找引用函数', 
    name: 'COLUMN', 
    syntax: 'COLUMN([reference])', 
    description: '返回引用的列号',
    parameters: [
      { name: 'reference', description: '单元格或范围，可选' }
    ],
    example: '=COLUMN() 返回当前列号，=COLUMN(C1) 返回 3', 
  },
  { 
    category: '查找引用函数', 
    name: 'ROWS', 
    syntax: 'ROWS(array)', 
    description: '返回范围的行数',
    parameters: [
      { name: 'array', description: '范围或数组' }
    ],
    example: '=ROWS(A1:C10) 返回 10', 
  },
  { 
    category: '查找引用函数', 
    name: 'COLUMNS', 
    syntax: 'COLUMNS(array)', 
    description: '返回范围的列数',
    parameters: [
      { name: 'array', description: '范围或数组' }
    ],
    example: '=COLUMNS(A1:C10) 返回 3', 
  },
  
  // 信息函数
  { 
    category: '信息函数', 
    name: 'ISNUMBER', 
    syntax: 'ISNUMBER(value)', 
    description: '检查是否为数值',
    parameters: [
      { name: 'value', description: '要检查的值' }
    ],
    example: '=ISNUMBER(A1)', 
  },
  { 
    category: '信息函数', 
    name: 'ISTEXT', 
    syntax: 'ISTEXT(value)', 
    description: '检查是否为文本',
    parameters: [
      { name: 'value', description: '要检查的值' }
    ],
    example: '=ISTEXT(A1)', 
  },
  { 
    category: '信息函数', 
    name: 'ISBLANK', 
    syntax: 'ISBLANK(value)', 
    description: '检查是否为空单元格',
    parameters: [
      { name: 'value', description: '要检查的值' }
    ],
    example: '=ISBLANK(A1)', 
    tip: '只有真正空的单元格返回TRUE，含空字符串返回FALSE' 
  },
  { 
    category: '信息函数', 
    name: 'ISERROR', 
    syntax: 'ISERROR(value)', 
    description: '检查是否为任意错误值',
    parameters: [
      { name: 'value', description: '要检查的值' }
    ],
    example: '=ISERROR(A1)', 
  },
  { 
    category: '信息函数', 
    name: 'ISNA', 
    syntax: 'ISNA(value)', 
    description: '检查是否为#N/A错误',
    parameters: [
      { name: 'value', description: '要检查的值' }
    ],
    example: '=ISNA(VLOOKUP(A1,B:C,2,0))', 
  },
  { 
    category: '信息函数', 
    name: 'TYPE', 
    syntax: 'TYPE(value)', 
    description: '返回值的数据类型',
    parameters: [
      { name: 'value', description: '要检查的值' }
    ],
    example: '=TYPE(A1) 返回：1=数值，2=文本，4=逻辑值，16=错误值，64=数组', 
  },
]

// 分类列表
export const excelFunctionCategories = [
  '数学函数',
  '文本函数',
  '日期函数',
  '逻辑函数',
  '查找引用函数',
  '信息函数'
]