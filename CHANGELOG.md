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