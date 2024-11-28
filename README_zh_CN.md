## ✨功能

使用思源的块引实现脚注和备注功能

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/%E6%80%9D%E6%BA%90%E7%AC%94%E8%AE%B0%E8%84%9A%E6%B3%A8%E6%8F%92%E4%BB%B62-2024-11-18.gif)

> 使用Tsundoku主题演示，对嵌套引述块样式进行了优化

## 📝更新日志

v1.1.5 / 2024.11.25

- ✨脚注引用的样式默认改为蓝色背景+蓝色字体颜色

v1.1.4 / 2024.11.25

- ✨支持设置脚注内容块的别名，提示这个块是脚注内容，设置为空则不设置别名
    ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-25_09-48-30-2024-11-25.png)
    ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-25_09-49-59-2024-11-25.png)
- 📝README添加设置脚注引用和脚注内容块的css

v1.1.3 / 2024.11.24

- ✨ 脚注内容模板支持渲染sprig语法，现在可以在脚注内容中插入当前时间了
    ```markdown
    >> ${{now | date "20060102 15:04:05"}} 摘抄
    >> ${selection} [[↩️]](siyuan://blocks/${refID})
    >> 
    > 💡${content}
    ```
    ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-24_15-03-43-2024-11-24.png)

  
v1.1.2 /2024.11.24
- 🐛 脚注内容模板中的selection变量：过滤掉脚注文本的正则表达式优化
- ✨ 选中文本添加自定义样式，现在支持对重叠文字添加不同脚注时，能保留不同脚注的选中文字样式，删除脚注时，只删除当前脚注选中的文本，不影响其他脚注选中文字的样式
   ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/脚注插件支持自定义样式对重叠文字添加不同脚注-2024-11-24.gif)
- ✨ 支持添加快捷键，默认快捷键ctrl+shift+F，可在设置自行修改
   ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-24_12-55-17-2024-11-24.png)

v1.1.1 / 2024.11.24

- ✨ 添加脚注引用css样式
    ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-24_01-39-40-2024-11-24.png)
- ✨ 脚注块引的自定义属性值改为脚注内容块id `custom-footnote="20241124013624-9oq7jfl"`，方便删除脚注内容块和为后面的脚注数字编号功能做准备
- ✨ 选中文本的样式设置，取消加粗、高亮等原生样式，改用自定义样式。注意：所以如果有对重叠文字重复添加脚注的需求，请不要开启自定义样式，会有样式冲突问题。
    ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-24_01-40-52-2024-11-24.png)

v1.1.0 / 2024.11.23

  - ✨支持设置脚注内容放到当前块后
      ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-23_20-16-16-2024-11-23.png)

v1.0.9 / 2024.11.23

  - ✨当前文档的脚注容器标题和指定文档的脚注容器标题可以用“#”设置标题级别，不输入“#”，默认为二级标题
      ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-23_18-58-47-2024-11-23.png)
  - ✨设置界面改善，由于不会做设置分栏(orz)，所以只是给设置添加了“脚注存放位置”、“脚注样式设置”两个title，方便查看
      ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-23_18-59-13-2024-11-23.png)
  - ✨支持重置设置，重置后会恢复插件默认设置
      ![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-23_18-59-34-2024-11-23.png)

## 📝使用介绍

> 思源笔记使用本插件的版本要求：>v3.1.13

**本插件支持高度自定义化，支持的设置如下：**


- **脚注存放设置**
  - **脚注存放位置**：可以设置脚注存放在当前文档、指定文档、子文档、父块后，默认为`当前文档`
  - **指定文档的文档ID** ：当脚注存放位置为“指定文档”时，设置某个文档存放所有的脚注

  - **当前文档的脚注容器标题**：当脚注存放位置为“当前文档”时，设置存放脚注的h2标题

  - **指定文档的脚注容器标题**：当脚注存放位置为“指定文档”时，设置存放脚注的h2标题。
  - **子文档的脚注容器标题**：当脚注存放位置为“子文档”时，设置存放脚注的文档标题名
  - **是否自动更新脚注容器标题**：每次创建脚注是否会自动更新脚注容器标题符合设置的模板
  - **插入脚注的顺序**：顺序或者倒序，默认：`顺序`
- **脚注样式设置**
  - **脚注引用样式**：脚注引用的样式：“块引”或“块链接”
  - **脚注块引锚文本**：设置脚注引用的锚文本，默认：`[注]`
  - **选中文本的样式**：选择无样式或自定义样式，默认：`无样式`。

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
    - 使用列表项存放引用原块的块引，锚文本为选中文字，可以在当前文档的反链面板查看所有脚注
      ```
      -  ((${refID} "${selection}"))

        {{{row
        ${content}
        }}}

      ```
    - 脚注内容模板支持渲染sprig语法，现在可以在脚注内容中插入当前时间了
        ```markdown
        >> ${{now | date "20060102 15:04:05"}} 摘抄
        >> ${selection} [[↩️]](siyuan://blocks/${refID})
        >> 
        > 💡${content}
        ```




![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-24_01-26-22-2024-11-24.png)
  
支持同时删除脚注引用和脚注内容，可以在脚注引用右键菜单，点击【插件-删除脚注】

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-18_16-39-18-2024-11-18.png)

支持对同一个文本进行多次备注

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/%E6%80%9D%E6%BA%90%E7%AC%94%E8%AE%B0%E8%84%9A%E6%B3%A8%E6%8F%92%E4%BB%B6%E6%94%AF%E6%8C%81%E5%AF%B9%E5%90%8C%E4%B8%80%E4%B8%AA%E6%96%87%E6%9C%AC%E8%BF%9B%E8%A1%8C%E5%A4%9A%E6%AC%A1%E5%A4%87%E6%B3%A8-2024-11-19.gif)

## 自定义脚注样式

自定义脚注引用的css
```
/* 自定义脚注引用样式 */
.protyle-wysiwyg [data-node-id] span[custom-footnote] {
    /* 设置背景色 */
    background-color: var(--b3-font-background3);
    
    /* 设置文字颜色 */
    color: var(--b3-theme-on-background) !important;
    
    /* 移除边框 */
    border: none!important;
    
    /* 设置左右外边距 */
    margin: 0 1px;
    
    /* 设置圆角 */
    border-radius: 3px;
}
```
自定义脚注内容块的css
```
/* 自定义脚注内容块样式 */
.protyle-wysiwyg [data-node-id][custom-plugin-footnote-content="true"] {
    /* 设置字体大小 */
    font-size: 0.8em;
    
    /* 设置文字颜色 */
    color: var(--b3-font-color5);
}
```
![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-25_09-47-46-2024-11-25.png)


## 🙏致谢

- [https://github.com/zxhd863943427/siyuan-plugin-memo](https://github.com/zxhd863943427/siyuan-plugin-memo)：基于该插件进行改进，添加了更多功能和配置项
- [https://github.com/siyuan-note/plugin-sample-vite-svelte](https://github.com/siyuan-note/plugin-sample-vite-svelte)：使用的插件模板，大幅提高开发效率

## ❤️ 用爱发电

穷苦研究生在读ing，如果喜欢我的插件，欢迎给GitHub仓库点star和捐赠，这会激励我继续完善此插件和开发新插件。

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20241118182532-2024-11-18.png)

> 2024.11.20 感谢muhaha捐赠¥30 
> 2024.11.27 感谢若为雄才捐赠¥1
> 2024.11.28 感谢sweesalt捐赠¥20