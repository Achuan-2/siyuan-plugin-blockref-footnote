## ✨功能

使用思源的块引实现脚注和备注功能

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/思源笔记脚注插件2-2024-11-18.gif)

> 使用Tsundoku主题演示，对嵌套引述块样式进行了优化

## 📝使用介绍

**设置**

- **脚注存放位置**：可以设置存放在当前文档或者指定文档，默认为`当前文档`
- **选中文本的样式**：可以选中加粗、高亮、斜体、下划线样式，默认：`无样式`
- **插入脚注的顺序**：顺序或者倒序，默认：`顺序`
- **脚注标题**：设置存放脚注的标题名，默认：`脚注`
- **脚注块引锚文本**：设置脚注引用的锚文本，默认：`注`
- **脚注内容模板**：设置脚注的模板，推荐使用引述块或超级块组合，保证脚注内容属于同一个块，默认使用嵌套引述块模板，可以自行更改，`${selection}`表示选中文本的内容，`${content}`代表脚注内容占位

  - 嵌套引述块模板

    ```markdown
    >> ${selection}
    >> 
    > 💡${content}
    ```

  - 竖向超级块组合模板

    ```markdown
    {{{row
    > ${selection}
    
    ${content}
    }}}
    ```

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-18_16-46-42-2024-11-18.png)

同时删除脚注引用和脚注内容，可以在脚注引用右键菜单，点击【插件-删除脚注】

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-18_16-39-18-2024-11-18.png)


## ❤️致谢

- https://github.com/zxhd863943427/siyuan-plugin-memo