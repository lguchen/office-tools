// Excel快捷键分类数据
export interface ExcelShortcut {
  category: string      // 分类：文件操作、编辑操作、格式操作、导航操作等
  keys: string          // 快捷键组合，如 "Ctrl+S"
  description: string   // 功能说明
  tip?: string          // 使用技巧
}

export const excelShortcuts: ExcelShortcut[] = [
  // 文件操作类
  { category: '文件操作', keys: 'Ctrl+S', description: '保存文件', tip: '快速保存，避免数据丢失' },
  { category: '文件操作', keys: 'Ctrl+O', description: '打开文件' },
  { category: '文件操作', keys: 'Ctrl+N', description: '新建工作簿' },
  { category: '文件操作', keys: 'Ctrl+W', description: '关闭当前工作簿' },
  { category: '文件操作', keys: 'Ctrl+P', description: '打印预览' },
  { category: '文件操作', keys: 'Ctrl+F4', description: '关闭当前窗口' },
  { category: '文件操作', keys: 'F12', description: '另存为' },
  { category: '文件操作', keys: 'Ctrl+Shift+S', description: '另存为（打开对话框）' },
  
  // 编辑操作类
  { category: '编辑操作', keys: 'Ctrl+C', description: '复制' },
  { category: '编辑操作', keys: 'Ctrl+V', description: '粘贴' },
  { category: '编辑操作', keys: 'Ctrl+X', description: '剪切' },
  { category: '编辑操作', keys: 'Ctrl+Z', description: '撤销' },
  { category: '编辑操作', keys: 'Ctrl+Y', description: '重做' },
  { category: '编辑操作', keys: 'Ctrl+F', description: '查找' },
  { category: '编辑操作', keys: 'Ctrl+H', description: '替换' },
  { category: '编辑操作', keys: 'Ctrl+G', description: '定位（跳转到指定单元格）' },
  { category: '编辑操作', keys: 'F5', description: '定位（同Ctrl+G）' },
  { category: '编辑操作', keys: 'Ctrl+A', description: '全选' },
  { category: '编辑操作', keys: 'Ctrl+D', description: '向下填充（复制上方单元格内容）' },
  { category: '编辑操作', keys: 'Ctrl+R', description: '向右填充（复制左侧单元格内容）' },
  { category: '编辑操作', keys: 'Ctrl+;', description: '输入当前日期' },
  { category: '编辑操作', keys: 'Ctrl+Shift+;', description: '输入当前时间' },
  { category: '编辑操作', keys: 'Ctrl+K', description: '插入超链接' },
  { category: '编辑操作', keys: 'Ctrl+Enter', description: '在多个选中单元格中同时输入内容' },
  { category: '编辑操作', keys: 'Alt+Enter', description: '单元格内换行' },
  { category: '编辑操作', keys: 'Delete', description: '删除单元格内容（不删除格式）' },
  { category: '编辑操作', keys: 'Ctrl+Delete', description: '删除从光标到行尾的内容' },
  { category: '编辑操作', keys: 'Ctrl+Shift+Z', description: '显示自动完成列表' },
  
  // 格式操作类
  { category: '格式操作', keys: 'Ctrl+B', description: '加粗' },
  { category: '格式操作', keys: 'Ctrl+I', description: '斜体' },
  { category: '格式操作', keys: 'Ctrl+U', description: '下划线' },
  { category: '格式操作', keys: 'Ctrl+1', description: '打开单元格格式对话框' },
  { category: '格式操作', keys: 'Ctrl+Shift+!', description: '应用千位分隔符和两位小数' },
  { category: '格式操作', keys: 'Ctrl+Shift+$', description: '应用货币格式' },
  { category: '格式操作', keys: 'Ctrl+Shift+%', description: '应用百分比格式' },
  { category: '格式操作', keys: 'Ctrl+Shift+#', description: '应用日期格式' },
  { category: '格式操作', keys: 'Ctrl+Shift+@', description: '应用时间格式' },
  { category: '格式操作', keys: 'Ctrl+Shift+^', description: '应用科学计数格式' },
  { category: '格式操作', keys: 'Ctrl+Shift+~', description: '应用常规格式' },
  
  // 选择操作类
  { category: '选择操作', keys: 'Shift+方向键', description: '扩展选择区域' },
  { category: '选择操作', keys: 'Ctrl+Shift+方向键', description: '扩展选择到数据边缘' },
  { category: '选择操作', keys: 'Ctrl+Shift+End', description: '选择到工作表末尾' },
  { category: '选择操作', keys: 'Ctrl+Shift+Home', description: '选择到工作表开头' },
  { category: '选择操作', keys: 'Ctrl+Space', description: '选择整列' },
  { category: '选择操作', keys: 'Shift+Space', description: '选择整行' },
  { category: '选择操作', keys: 'Ctrl+Shift+Space', description: '选择整个工作表' },
  { category: '选择操作', keys: 'Ctrl+Shift+O', description: '选择所有含批注的单元格' },
  
  // 导航操作类
  { category: '导航操作', keys: '方向键', description: '移动一个单元格' },
  { category: '导航操作', keys: 'Ctrl+方向键', description: '跳转到数据区域边缘' },
  { category: '导航操作', keys: 'Ctrl+Home', description: '跳转到A1单元格' },
  { category: '导航操作', keys: 'Ctrl+End', description: '跳转到最后一个数据单元格' },
  { category: '导航操作', keys: 'Ctrl+Page Up', description: '切换到上一工作表' },
  { category: '导航操作', keys: 'Ctrl+Page Down', description: '切换到下一工作表' },
  { category: '导航操作', keys: 'Ctrl+Tab', description: '切换到下一个打开的工作簿' },
  { category: '导航操作', keys: 'Ctrl+Shift+Tab', description: '切换到上一个打开的工作簿' },
  { category: '导航操作', keys: 'Tab', description: '向右移动一个单元格' },
  { category: '导航操作', keys: 'Shift+Tab', description: '向左移动一个单元格' },
  { category: '导航操作', keys: 'Enter', description: '向下移动一个单元格（或确认输入）' },
  { category: '导航操作', keys: 'Shift+Enter', description: '向上移动一个单元格' },
  
  // 插入删除操作类
  { category: '插入删除操作', keys: 'Ctrl+Shift++', description: '插入单元格/行/列' },
  { category: '插入删除操作', keys: 'Ctrl+-', description: '删除单元格/行/列' },
  { category: '插入删除操作', keys: 'Ctrl+9', description: '隐藏行' },
  { category: '插入删除操作', keys: 'Ctrl+Shift+9', description: '取消隐藏行' },
  { category: '插入删除操作', keys: 'Ctrl+0', description: '隐藏列' },
  { category: '插入删除操作', keys: 'Ctrl+Shift+0', description: '取消隐藏列' },
  { category: '插入删除操作', keys: 'Ctrl+Shift+(', description: '取消隐藏行' },
  { category: '插入删除操作', keys: 'Ctrl+Shift+)', description: '取消隐藏列' },
  
  // 公式函数类
  { category: '公式函数', keys: 'F2', description: '编辑单元格（进入编辑模式）' },
  { category: '公式函数', keys: 'F3', description: '粘贴名称（插入名称对话框）' },
  { category: '公式函数', keys: 'F4', description: '重复上一次操作/切换引用类型（绝对/相对）' },
  { category: '公式函数', keys: 'F9', description: '计算所有工作表' },
  { category: '公式函数', keys: 'Shift+F9', description: '计算当前工作表' },
  { category: '公式函数', keys: 'Ctrl+F3', description: '打开名称管理器' },
  { category: '公式函数', keys: 'Ctrl+Shift+F3', description: '根据行列标签创建名称' },
  { category: '公式函数', keys: 'Ctrl+`', description: '显示/隐藏公式' },
  { category: '公式函数', keys: 'Ctrl+Shift+Enter', description: '输入数组公式' },
  { category: '公式函数', keys: 'Alt+=', description: '自动求和（插入SUM函数）' },
  
  // 数据操作类
  { category: '数据操作', keys: 'Ctrl+Shift+L', description: '启用/关闭筛选' },
  { category: '数据操作', keys: 'Alt+D+L', description: '打开数据筛选对话框' },
  { category: '数据操作', keys: 'Alt+D+F+F', description: '自动筛选' },
  { category: '数据操作', keys: 'Ctrl+Alt+V', description: '选择性粘贴对话框' },
  { category: '数据操作', keys: 'Alt+E+S', description: '选择性粘贴（旧版快捷键）' },
  
  // 工作表操作类
  { category: '工作表操作', keys: 'Shift+F11', description: '插入新工作表' },
  { category: '工作表操作', keys: 'Ctrl+Shift+F11', description: '插入新图表工作表' },
  { category: '工作表操作', keys: 'Alt+Shift+F1', description: '插入新工作表' },
  { category: '工作表操作', keys: 'Ctrl+Shift+Page Up', description: '选择当前和上一工作表' },
  { category: '工作表操作', keys: 'Ctrl+Shift+Page Down', description: '选择当前和下一工作表' },
  
  // 窗口操作类
  { category: '窗口操作', keys: 'Ctrl+F10', description: '最大化/还原窗口' },
  { category: '窗口操作', keys: 'Ctrl+F9', description: '最小化窗口' },
  { category: '窗口操作', keys: 'Ctrl+F7', description: '移动窗口' },
  { category: '窗口操作', keys: 'Ctrl+F8', description: '调整窗口大小' },
  { category: '窗口操作', keys: 'Ctrl+F6', description: '切换到下一个窗口' },
  { category: '窗口操作', keys: 'Ctrl+Shift+F6', description: '切换到上一个窗口' },
  
  // 其他操作类
  { category: '其他操作', keys: 'F1', description: '打开帮助' },
  { category: '其他操作', keys: 'F7', description: '拼写检查' },
  { category: '其他操作', keys: 'F8', description: '扩展模式（选择区域）' },
  { category: '其他操作', keys: 'F10', description: '激活菜单栏' },
  { category: '其他操作', keys: 'F11', description: '创建图表' },
  { category: '其他操作', keys: 'Shift+F10', description: '显示右键菜单' },
  { category: '其他操作', keys: 'Ctrl+F1', description: '显示/隐藏功能区' },
  { category: '其他操作', keys: 'Alt+F4', description: '退出Excel' },
  { category: '其他操作', keys: 'Alt+Tab', description: '切换应用程序' },
]

// 分类列表
export const excelShortcutCategories = [
  '文件操作',
  '编辑操作',
  '格式操作',
  '选择操作',
  '导航操作',
  '插入删除操作',
  '公式函数',
  '数据操作',
  '工作表操作',
  '窗口操作',
  '其他操作'
]