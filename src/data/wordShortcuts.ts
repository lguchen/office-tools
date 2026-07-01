// Word快捷键分类数据
export interface WordShortcut {
  category: string      // 分类：文件操作、编辑操作、格式操作、导航操作等
  keys: string          // 快捷键组合，如 "Ctrl+S"
  description: string   // 功能说明
  tip?: string          // 使用技巧
}

export const wordShortcuts: WordShortcut[] = [
  // 文件操作类
  { category: '文件操作', keys: 'Ctrl+S', description: '保存文件', tip: '快速保存，避免数据丢失' },
  { category: '文件操作', keys: 'Ctrl+O', description: '打开文件' },
  { category: '文件操作', keys: 'Ctrl+N', description: '新建文档' },
  { category: '文件操作', keys: 'Ctrl+W', description: '关闭当前文档' },
  { category: '文件操作', keys: 'Ctrl+P', description: '打印' },
  { category: '文件操作', keys: 'F12', description: '另存为' },
  { category: '文件操作', keys: 'Ctrl+Shift+S', description: '另存为' },
  { category: '文件操作', keys: 'Ctrl+F4', description: '关闭当前窗口' },
  
  // 编辑操作类
  { category: '编辑操作', keys: 'Ctrl+C', description: '复制' },
  { category: '编辑操作', keys: 'Ctrl+V', description: '粘贴' },
  { category: '编辑操作', keys: 'Ctrl+X', description: '剪切' },
  { category: '编辑操作', keys: 'Ctrl+Z', description: '撤销' },
  { category: '编辑操作', keys: 'Ctrl+Y', description: '重做' },
  { category: '编辑操作', keys: 'Ctrl+F', description: '查找' },
  { category: '编辑操作', keys: 'Ctrl+H', description: '替换' },
  { category: '编辑操作', keys: 'Ctrl+G', description: '定位（跳转到页/节/行）' },
  { category: '编辑操作', keys: 'F5', description: '定位（同Ctrl+G）' },
  { category: '编辑操作', keys: 'Ctrl+A', description: '全选' },
  { category: '编辑操作', keys: 'Ctrl+Shift+C', description: '复制格式' },
  { category: '编辑操作', keys: 'Ctrl+Shift+V', description: '粘贴格式' },
  { category: '编辑操作', keys: 'Ctrl+B', description: '加粗' },
  { category: '编辑操作', keys: 'Ctrl+I', description: '斜体' },
  { category: '编辑操作', keys: 'Ctrl+U', description: '下划线' },
  { category: '编辑操作', keys: 'Delete', description: '删除选中的内容' },
  { category: '编辑操作', keys: 'Backspace', description: '删除前一个字符' },
  { category: '编辑操作', keys: 'Ctrl+Delete', description: '删除到词尾' },
  { category: '编辑操作', keys: 'Ctrl+Backspace', description: '删除到词头' },
  
  // 格式操作类
  { category: '格式操作', keys: 'Ctrl+Shift+F', description: '打开字体对话框' },
  { category: '格式操作', keys: 'Ctrl+D', description: '打开字体对话框' },
  { category: '格式操作', keys: 'Ctrl+Shift+>', description: '增大字体' },
  { category: '格式操作', keys: 'Ctrl+Shift+<', description: '减小字体' },
  { category: '格式操作', keys: 'Ctrl+]', description: '增大字体1磅' },
  { category: '格式操作', keys: 'Ctrl+[', description: '减小字体1磅' },
  { category: '格式操作', keys: 'Ctrl+Shift+N', description: '应用正文样式' },
  { category: '格式操作', keys: 'Ctrl+Shift+L', description: '应用列表样式' },
  { category: '格式操作', keys: 'Ctrl+Shift+K', description: '小型大写字母' },
  { category: '格式操作', keys: 'Ctrl+Space', description: '删除格式（恢复默认字体）' },
  { category: '格式操作', keys: 'Ctrl+E', description: '居中对齐' },
  { category: '格式操作', keys: 'Ctrl+L', description: '左对齐' },
  { category: '格式操作', keys: 'Ctrl+R', description: '右对齐' },
  { category: '格式操作', keys: 'Ctrl+J', description: '两端对齐' },
  { category: '格式操作', keys: 'Ctrl+M', description: '增加缩进' },
  { category: '格式操作', keys: 'Ctrl+Shift+M', description: '减少缩进' },
  { category: '格式操作', keys: 'Ctrl+T', description: '悬挂缩进' },
  { category: '格式操作', keys: 'Ctrl+Shift+T', description: '减少悬挂缩进' },
  { category: '格式操作', keys: 'Ctrl+Q', description: '删除段落格式' },
  
  // 段落操作类
  { category: '段落操作', keys: 'Ctrl+Enter', description: '插入分页符' },
  { category: '段落操作', keys: 'Ctrl+Shift+Enter', description: '插入分栏符' },
  { category: '段落操作', keys: 'Shift+Enter', description: '插入换行符（软回车）' },
  { category: '段落操作', keys: 'Ctrl+Shift+Space', description: '插入不间断空格' },
  { category: '段落操作', keys: 'Ctrl+-', description: '插入不间断连字符' },
  { category: '段落操作', keys: 'Alt+Ctrl+-', description: '插入短破折号' },
  { category: '段落操作', keys: 'Alt+Ctrl+Shift+-', description: '插入长破折号' },
  
  // 选择操作类
  { category: '选择操作', keys: 'Shift+方向键', description: '扩展选择一个字符/行' },
  { category: '选择操作', keys: 'Ctrl+Shift+方向键', description: '扩展选择一个单词/段落' },
  { category: '选择操作', keys: 'Shift+Home', description: '选择到行首' },
  { category: '选择操作', keys: 'Shift+End', description: '选择到行尾' },
  { category: '选择操作', keys: 'Ctrl+Shift+Home', description: '选择到文档开头' },
  { category: '选择操作', keys: 'Ctrl+Shift+End', description: '选择到文档末尾' },
  { category: '选择操作', keys: 'Ctrl+A', description: '选择整个文档' },
  { category: '选择操作', keys: 'F8', description: '扩展选择模式' },
  { category: '选择操作', keys: 'Shift+F8', description: '缩小选择' },
  { category: '选择操作', keys: 'Esc', description: '取消选择' },
  
  // 导航操作类
  { category: '导航操作', keys: 'Home', description: '移动到行首' },
  { category: '导航操作', keys: 'End', description: '移动到行尾' },
  { category: '导航操作', keys: 'Ctrl+Home', description: '移动到文档开头' },
  { category: '导航操作', keys: 'Ctrl+End', description: '移动到文档末尾' },
  { category: '导航操作', keys: 'Ctrl+方向键', description: '移动一个单词/段落' },
  { category: '导航操作', keys: 'Page Up', description: '向上翻页' },
  { category: '导航操作', keys: 'Page Down', description: '向下翻页' },
  { category: '导航操作', keys: 'Ctrl+Page Up', description: '移动到上一页顶部' },
  { category: '导航操作', keys: 'Ctrl+Page Down', description: '移动到下一页底部' },
  { category: '导航操作', keys: 'Alt+Ctrl+Page Up', description: '移动到上一页' },
  { category: '导航操作', keys: 'Alt+Ctrl+Page Down', description: '移动到下一页' },
  { category: '导航操作', keys: 'Ctrl+Tab', description: '移动到下一个单元格（表格中）' },
  { category: '导航操作', keys: 'Ctrl+Shift+Tab', description: '移动到上一个单元格（表格中）' },
  
  // 表格操作类
  { category: '表格操作', keys: 'Tab', description: '移动到下一个单元格' },
  { category: '表格操作', keys: 'Shift+Tab', description: '移动到上一个单元格' },
  { category: '表格操作', keys: 'Alt+Home', description: '移动到行的第一个单元格' },
  { category: '表格操作', keys: 'Alt+End', description: '移动到行的最后一个单元格' },
  { category: '表格操作', keys: 'Alt+Page Up', description: '移动到列的第一个单元格' },
  { category: '表格操作', keys: 'Alt+Page Down', description: '移动到列的最后一个单元格' },
  { category: '表格操作', keys: 'Shift+Alt+方向键', description: '选择整行/整列' },
  { category: '表格操作', keys: 'Ctrl+Shift+Enter', description: '拆分表格' },
  
  // 视图操作类
  { category: '视图操作', keys: 'Ctrl+Alt+N', description: '普通视图' },
  { category: '视图操作', keys: 'Ctrl+Alt+P', description: '页面视图' },
  { category: '视图操作', keys: 'Ctrl+Alt+O', description: '大纲视图' },
  { category: '视图操作', keys: 'Ctrl+Alt+S', description: '拆分窗口' },
  { category: '视图操作', keys: 'Alt+Shift+C', description: '关闭拆分窗口' },
  { category: '视图操作', keys: 'F11', description: '全屏显示' },
  { category: '视图操作', keys: 'Alt+Ctrl+F2', description: '打开文件对话框' },
  { category: '视图操作', keys: 'Ctrl+F10', description: '最大化/还原窗口' },
  
  // 插入操作类
  { category: '插入操作', keys: 'Alt+Ctrl+I', description: '插入标记索引项' },
  { category: '插入操作', keys: 'Alt+Ctrl+L', description: '插入脚注' },
  { category: '插入操作', keys: 'Alt+Ctrl+F', description: '插入尾注' },
  { category: '插入操作', keys: 'Ctrl+K', description: '插入超链接' },
  { category: '插入操作', keys: 'Alt+Shift+D', description: '插入日期字段' },
  { category: '插入操作', keys: 'Alt+Shift+T', description: '插入时间字段' },
  { category: '插入操作', keys: 'Alt+Shift+P', description: '插入页码字段' },
  { category: '插入操作', keys: 'Alt+Ctrl+Y', description: '重复查找' },
  
  // 其他操作类
  { category: '其他操作', keys: 'F1', description: '打开帮助' },
  { category: '其他操作', keys: 'F7', description: '拼写检查' },
  { category: '其他操作', keys: 'Shift+F7', description: '同义词词典' },
  { category: '其他操作', keys: 'F9', description: '更新字段' },
  { category: '其他操作', keys: 'Shift+F9', description: '切换域代码显示' },
  { category: '其他操作', keys: 'Alt+F9', description: '显示所有域代码' },
  { category: '其他操作', keys: 'Ctrl+Shift+F9', description: '将字段转换为文本' },
  { category: '其他操作', keys: 'F10', description: '激活菜单栏' },
  { category: '其他操作', keys: 'Shift+F10', description: '显示右键菜单' },
  { category: '其他操作', keys: 'Ctrl+F1', description: '显示/隐藏功能区' },
  { category: '其他操作', keys: 'Alt+F4', description: '退出Word' },
  { category: '其他操作', keys: 'Ctrl+Alt+Z', description: '返回上次编辑位置' },
  { category: '其他操作', keys: 'Ctrl+Shift+F5', description: '编辑书签' },
  { category: '其他操作', keys: 'Alt+Shift+K', description: '预览邮件合并' },
  { category: '其他操作', keys: 'Alt+Shift+N', description: '合并文档' },
]

// 分类列表
export const wordShortcutCategories = [
  '文件操作',
  '编辑操作',
  '格式操作',
  '段落操作',
  '选择操作',
  '导航操作',
  '表格操作',
  '视图操作',
  '插入操作',
  '其他操作'
]