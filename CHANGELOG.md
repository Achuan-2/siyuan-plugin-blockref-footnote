## v1.4.8 / 2025.07.17
- ✨ 支持块级脚注 [#44](https://github.com/Achuan-2/siyuan-plugin-footnote/issues/44)
  - 限制块级脚注只能一个块，要备注多个块自行使用超级块
  - 如果一个块存在脚注，块菜单显示「跳转到脚注」和「删除脚注」，隐藏「添加脚注按钮」
- 🔧 chore(plugin.json): 将minAppVersion从3.2.0更新为3.2.1
- ✨  Protyle组件click.preventInsetEmptyBlock设置为true,这样无需添加

## v1.4.7 / 2025.07.17
- 🚀 perf：优化脚注文字显示/隐藏的性能
- 🚀 perf：优化取消脚注重新编号性能


## v1.4.6 / 2025.07.17

- 🚀 perf：优化脚注编号更新性能
   - 脚注引用编号按块来更新，适配长文档
   - 脚注内容块的编号更新，仅在编号需要更新时才执行操作，减少不必要的DOM更新
- ✨ feat: 新建脚注之后，如果脚注面板启用会自动更新

## v1.4.5 / 2025.07.16

- ✨ 脚注编号支持显示进度
- 💄 style(FootnoteDialog): 调整脚注弹窗样式和行为
  - 修改弹窗的 zIndex 为 4
  - 不显示块标
  - 优化脚注弹窗的显示逻辑

## v1.4.4 / 2025.07.16

- 💄 style(FootnoteDialog): 调整脚注弹窗样式
  - 修改弹窗的 z-index 为 99
  - 禁用面包屑显示
- ✨ 脚注Dock面板： 优化脚注索引和引用的点击交互
  - 为脚注索引添加点击事件以打开对应脚注
  - 为引用内容添加点击事件以打开原始内容
- ♻️ refactor：优化删除脚注处理
  - 添加对保存事务的调用
  - 更新脚注重排序逻辑以确保正确性
  - 引入 refreshSql 方法以刷新数据库状态
- ♻️ 更新最低应用版本要求
  - 将 minAppVersion 从 3.1.13 更新为 3.2.0


## v1.4.3 / 2025.07.15

- ✨ 改进脚注编号体验:改进脚注内容块添加到父块后的脚注编号体验

  **从“全局排序”变为“分组排序”** 。先按“锚点块”（即引用脚注的父块）对所有脚注进行分组，然后对每个组内的脚注块应用LCS（最长公共子序列）算法进行局部最优排序。这样能最大程度地减少 `moveBlock` 的调用次数，从而提升性能。

## v1.4.2 / 2025.07.15
- ✨ 改进脚注编号体验
  1. 改用protyle 弹窗显示块，关闭弹窗之后进行编号
  2. 弃用getDoc改用getBlockDOM来更新脚注编号，避免折叠标题丢失 [#37](https://github.com/Achuan-2/siyuan-plugin-footnote/issues/37)
  3. 脚注内容块的编号以及脚注内容块顺序调整只给需要更改的块进行更新，减少更新块时间
- ♻️  refactor(Footnote): 优化脚注内容块排序逻辑 [#43](https://github.com/Achuan-2/siyuan-plugin-footnote/issues/43)

  - 使用LCS算法智能排序脚注块
  - 改进脚注引用元素的映射逻辑
  - 更新相关注释以提高代码可读性
- 💄 style(FootnoteDock): 移除脚注项头部背景色
- ♻️ refactor(FootnoteDialog): 优化弹窗事件处理逻辑
  总结关闭弹窗触发条件
  - 按关闭按钮
  - 按esc键
  - 点击空白位置双击

  

## v1.4.1 / 2025.07.15
- ✨ dock栏显示当前所有脚注 [[#41](https://github.com/Achuan-2/siyuan-plugin-footnote/issues/41)](https://github.com/Achuan-2/siyuan-plugin-footnote/issues/41)
- ✨命令面板：脚注编号，编号时将自动排序内容块

## v1.4.0 / 2025.07.14
- ✨ 插件设置支持多Tab
- 📝 更改脚注默认模板

## v1.3.0 /2024.12.13

- 🐛 当在设置里开启只读模式后，添加脚注后脚注弹窗不可写入 
- ✨ `${selection:text}`变量要对特殊符号进行处理，比如把英文双引号变为`&quot;`

## v1.2.9 /2024.12.09
- 💄 优化块引弹窗窗口大小

## v1.2.8 / 2024.12.08

- 📝 完善README

## v1.2.7 / 2024.12.08



* ✨脚注内容模板新增`${selection:text}`变量，代表选中文本的纯文本内容

  例子

  ```markdown
  - ((${refID} "${selection:text}"))

    {{{row
    ${content}
    }}}
  ```
* ✨插件命令运行过程中添加正在处理弹窗，禁止编辑

  ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-12-08_16-27-40-2024-12-08.png)

  ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-12-08_16-28-12-2024-12-08.png)



## v1.2.6 / 2024.12.06
- 🐛 当在设置里开启只读模式后，添加脚注后脚注弹窗不可写入

## v1.2.5 / 2024.12.05
- 💄 双击非弹窗部分，关闭弹窗
- 💄 默认css添加导出pdf脚注引用为上标样式
- ✨ 命令面板支持隐藏/显示选中的文本
- ✨ 设置添加选项，脚注支持不弹窗
- 🐛 聚焦浮窗添加脚注，已经选择在当前文档末尾添加脚注，但只会在浮窗的最后添加，而不是文档最后添加

## v1.2.4/ 2024.12.02

- 🐛 发现脚注编号有重大bug，长文档可能会造成块丢失，暂时先改为耗时方法进行编号，保证原内容不丢失，但在插件编号过程中添加新内容依然会造成内容丢失，如无必要请勿开启脚注自动编号功能，有需要可以脚注添加完成之后，使用命令对脚注进行批量编号


## v1.2.3 / 2024.12.02

- 🐛 fix 命令【取消脚注编号】对index内容的重命名错误

## v1.2.2 / 2024.12.02

- ✨ 脚注容器标题可以支持设置为段落块，不需要一定是标题了！


## v1.2.1 / 2024.12.02

- 📝 优化模板index变量的i18n，中文默认为[注]，英文为[*]
- 📝 README完善：更换功能预览图，补充模板使用介绍


## v1.2.0 / 2024.12.01

- ✨ 脚注内容模板新增脚注编号变量：`${index}`脚注编号默认带原块链接，`${index:text}`脚注编号纯文本
- 🔥 取消脚注启用编号对脚注内容块添加命名的操作
   
![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-12-01_23-01-13-2024-12-01.png)

实现上面GIF的效果：
开启脚注自动编号，脚注内容模板设置为
```markdown
{{{col
${index}
{: style="width: 2.5em; flex: 0 0 auto;"}

{{{row
${content}
}}}

}}}
```
之前版本或者原来模板没有添加`${index}`变量的块想要自动编号，可以在每个脚注内容块里粘贴下面内容，然后命令面板运行【脚注编号】命令

```
<span data-type="custom-footnote-index" >[注]</span>
```


## v1.1.9 / 2024.12.01
- 📝README 补充插件的命令介绍
- ✨ 命令面板添加取消脚注自动编号命令 #17

## v1.1.8 / 2024.12.01


- 💄完善自定义弹窗界面


## v1.1.7  / 2024.12.01


- ✨ 现在不勾选脚注自动编号时，添加脚注的弹窗可以使用思源富文本功能编辑脚注内容啦，但是勾选脚注自动编号，还是只能纯文本格式添加脚注内容
因为我暂时实现不了同时更新脚注编号又同时显示特定块的功能，需要富文本编辑，可以等脚注排完序，再悬浮脚注引用编辑
   
   ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-12-01_12-59-22-2024-12-01.png)
- 🐛 修复勾选脚注自动编号，弹窗添加脚注添加多行时的错误。


## v1.1.6 / 2024.11.30 脚注支持脚注数字编号啦！

- 💄在插件设置里添加自定义css功能，不需要还跑到代码片段写了！

    ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-30_18-43-00-2024-11-30.png)
- ✨添加脚注弹出插件自定义的弹窗，进行输入脚注内容，可以避免使用块引浮窗不方便定位插件创建的单个块的问题，也能减少块引浮窗显示的延迟感
    ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-30_18-44-29-2024-11-30.png)
- ✨脚注支持有序编号：需要在插件设置中开启
  * 支持排序脚注编号
  * 支持排序脚注内容块
  * 支持删除后进行编号
  * 命令面板添加【脚注数字编号】命令：由于之前的设计存在问题，所以插件 v1.1.5 及之前的脚注不支持转换为数字编号样式
    ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-30_18-55-09-2024-11-30.png)
    ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/脚注插件支持编号-2024-11-30.gif)

## v1.1.5 / 2024.11.25

- ✨脚注引用的样式默认改为蓝色背景+蓝色字体颜色

## v1.1.4 / 2024.11.25

- ✨支持设置脚注内容块的别名，提示这个块是脚注内容，设置为空则不设置别名
    ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-25_09-48-30-2024-11-25.png)
    ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-25_09-49-59-2024-11-25.png)
- 📝README添加设置脚注引用和脚注内容块的css


## v1.1.3 / 2024.11.24

- ✨ 脚注内容模板支持渲染sprig语法，现在可以在脚注内容中插入当前时间了
    ```markdown
    >> ${{now | date "20060102 15:04:05"}} 摘抄
    >> ${selection} [[↩️]](siyuan://blocks/${refID})
    >> 
    > 💡${content}
    ```
    ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-24_15-03-43-2024-11-24.png)



## v1.1.2 /2024.11.24
- 🐛 脚注内容模板中的selection变量：过滤掉脚注文本的正则表达式优化
- ✨ 选中文本添加自定义样式，现在支持对重叠文字添加不同脚注时，能保留不同脚注的选中文字样式，删除脚注时，只删除当前脚注选中的文本，不影响其他脚注选中文字的样式
   ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/脚注插件支持自定义样式对重叠文字添加不同脚注-2024-11-24.gif)
- ✨ 支持添加快捷键，默认快捷键ctrl+shift+F，可在设置自行修改
   ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-24_12-55-17-2024-11-24.png)

## v1.1.1 / 2024.11.24

- ✨ 添加脚注引用css样式
    ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-24_01-39-40-2024-11-24.png)
- ✨ 脚注块引的自定义属性值改为脚注内容块id `custom-footnote="20241124013624-9oq7jfl"`，方便删除脚注内容块和为后面的脚注数字编号功能做准备
- ✨ 选中文本的样式设置，取消加粗、高亮等原生样式，改用自定义样式。注意：所以如果有对重叠文字重复添加脚注的需求，请不要开启自定义样式，会有样式冲突问题。
    ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-24_01-40-52-2024-11-24.png)

## v1.1.0 / 2024.11.23

  - ✨支持设置脚注内容放到当前块后
      ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-23_20-16-16-2024-11-23.png)
  
## v1.0.9 / 2024.11.23

  - ✨当前文档的脚注容器标题和指定文档的脚注容器标题可以用“#”设置标题级别，不输入“#”，默认为二级标题
      ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-23_18-58-47-2024-11-23.png)
  - ✨设置界面改善，由于不会做设置分栏(orz)，所以只是给设置添加了“脚注存放位置”、“脚注样式设置”两个title，方便查看
      ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-23_18-59-13-2024-11-23.png)
  - ✨支持重置设置，重置后会恢复插件默认设置
      ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-23_18-59-34-2024-11-23.png)

## v1.0.8 / 2024.11.21
- 📝 完善README、优化设置项的表述
- 🐛 修复脚注引用为块超链接时，无法同时删除脚注内容的问题

## v1.0.7 / 2024.11.20

- ✨优化获取选中文本的方式，不再污染剪贴板：之前选择的是`document.execCommand('copy')`，现在改用`range.cloneContents())`
- ✨优化当选择脚注引用为块链接时的删除脚注和过滤选中文本中的脚注逻辑

## v1.0.6 / 2024.11.20
- ✨脚注内容模板新增`${refID}`，代表选中文本所在的块ID，现在可以通过模板插入选中文本所在的块链接了，方便在脚注内容里直接跳转到原来的块
    ```markdown
    {{{row
    > ${selection} [[↩️]](siyuan://blocks/${refID})
    
    ${content}
    }}}
    {: style="border: 2px dashed var(--b3-border-color);"}
  ```
  ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/思源笔记脚注插件支持直接跳转到原来的块-2024-11-20.gif)


## v1.0.5 / 2024.11.20
- ✨支持设置脚注块引为块超链接
- ✨支持设置脚注放在子文档

## v1.0.4 / 2024.11.20
- ✨ 脚注内容默认模板完善，用kramdown语法设置边框样式
    ```markdown
    {{{row
    > ${selection}
    
    ${content}
    }}}
    {: style="border: 2px dashed var(--b3-border-color);"}
    ```
- ✨脚注块引默认模板完善，从“注”改为“[注]”
- 📝完善文档

## v1.0.3 / 2024.11.19

- ✨ 脚注块引用自定义属性custom-footnote实现，不用style

## v1.0.2 / 2024.11.19

- ✨对选中文本（变量：selection）进行过滤，不包含脚注锚文本，这样方便对重叠的内容进行脚注

## v1.0.1 / 2024.11.19

- 📝更新README

## v1.0.0 / 2024.11.18

**实现基本功能**
- 设置个性化设置
  - **脚注存放位置**：可以设置存放在当前文档或者指定文档，默认为`当前文档`
  - **选中文本的样式**：可以选中加粗、高亮、斜体、下划线样式，默认：`无样式`
  - **插入脚注的顺序**：顺序或者倒序，默认：`顺序`
  - **脚注标题**：设置存放脚注的标题，默认：`脚注`
  - **脚注块引锚文本**：设置脚注引用的锚文本，默认：`注`
  - **脚注内容模板**：设置脚注的模板，推荐使用引述块或超级块组合，保证脚注内容属于同一个块，默认使用嵌套引述块模板，可以自行更改，`${selection}`表示选中文本的内容，`${content}`代表脚注内容占位

    ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-18_16-46-42-2024-11-18.png)
- **支持删除脚注**
  ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-18_15-35-31-2024-11-18.png)