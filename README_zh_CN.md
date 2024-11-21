## ✨功能

使用思源的块引实现脚注和备注功能

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/%E6%80%9D%E6%BA%90%E7%AC%94%E8%AE%B0%E8%84%9A%E6%B3%A8%E6%8F%92%E4%BB%B62-2024-11-18.gif)

> 使用Tsundoku主题演示，对嵌套引述块样式进行了优化

## 📝更新日志

见[CHANGELOG.md](https://fastly.jsdelivr.net/gh/Achuan-2/siyuan-plugin-blockref-footnote/CHANGELOG.md)

## 📝使用介绍

> 思源笔记使用本插件的版本要求：>v3.1.13

**本插件支持高度自定义化，支持的设置如下：**


- **脚注容器设置**
  - **脚注存放位置**：可以设置脚注存放在当前文档、指定文档或子文档，默认为`当前文档`
  - **指定文档的文档ID** ：当脚注存放位置为“指定文档”时，设置某个文档存放所有的脚注

  - **当前文档的脚注容器标题**：当脚注存放位置为“当前文档”时，设置存放脚注的h2标题

  - **指定文档和子文档的脚注容器标题**：当脚注存放位置为“指定文档”时，设置存放脚注的h2标题。当脚注存放位置为“子文档”时，设置存放脚注的文档标题名
  - **是否自动更新脚注容器标题**：每次创建脚注是否会自动更新脚注容器标题符合设置的模板
- **脚注引用样式**：脚注引用的样式：“块引”或“块链接”
- **脚注块引锚文本**：设置脚注引用的锚文本，默认：`[注]`
- **选中文本的样式**：可以为选中文本添加加粗、高亮、斜体、下划线样式，默认：`无样式`
- **插入脚注的顺序**：顺序或者倒序，默认：`顺序`
- **脚注内容模板**：设置脚注的模板，推荐使用嵌套引述块或超级块来存放脚注内容，保证脚注内容属于同一个块，`${selection}`代表选中文本的内容，`${content}`代表脚注内容占位，`${refID}`代表选中文本所在的块的ID。另外可以使用kramdown语法设置教主内容块的块样式。

  - 嵌套引述块模板

    ```markdown
    >> ${selection} [[↩️]](siyuan://blocks/${refID})
    >> 
    > 💡${content}
    ```

    - 竖向超级块组合模板，添加虚线框样式

    ```markdown
    {{{row
    > ${selection} [[↩️]](siyuan://blocks/${refID})
    
    ${content}
    }}}
    {: style="border: 2px dashed var(--b3-border-color);"}
    ```



![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-21_08-52-02-2024-11-21.png)
  
支持同时删除脚注引用和脚注内容，可以在脚注引用右键菜单，点击【插件-删除脚注】

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-18_16-39-18-2024-11-18.png)

支持对同一个文本进行多次备注

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/%E6%80%9D%E6%BA%90%E7%AC%94%E8%AE%B0%E8%84%9A%E6%B3%A8%E6%8F%92%E4%BB%B6%E6%94%AF%E6%8C%81%E5%AF%B9%E5%90%8C%E4%B8%80%E4%B8%AA%E6%96%87%E6%9C%AC%E8%BF%9B%E8%A1%8C%E5%A4%9A%E6%AC%A1%E5%A4%87%E6%B3%A8-2024-11-19.gif)



## 🙏致谢

- [https://github.com/zxhd863943427/siyuan-plugin-memo](https://github.com/zxhd863943427/siyuan-plugin-memo)：基于该插件进行改进，添加了更多功能和配置项
- [https://github.com/siyuan-note/plugin-sample-vite-svelte](https://github.com/siyuan-note/plugin-sample-vite-svelte)：使用的插件模板，大幅提高开发效率

## ❤️ 用爱发电

穷苦研究生在读ing，如果喜欢我的插件，欢迎给GitHub仓库点star和捐赠，这会激励我继续完善此插件和开发新插件。

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20241118182532-2024-11-18.png)