## ✨功能

使用思源的块引实现脚注和备注功能

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/脚注插件功能预览-2024-12-02.gif)

## 📝更新日志

最近更新

v1.2.7 / 2024.12.08

* ✨脚注内容模板新增 `${selection:text}`变量，代表选中文本的纯文本内容

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

v1.2.5 / 2024.12.05

- 💄 双击非弹窗部分，关闭弹窗
- 💄 默认css添加导出pdf脚注引用为上标样式
- ✨ 命令面板支持隐藏/显示选中的文本
- ✨ 设置添加选项，脚注支持不弹窗
- 🐛 聚焦浮窗添加脚注，已经选择在当前文档末尾添加脚注，但只会在浮窗的最后添加，而不是文档最后添加

完整更新日志见：[ChangeLog](https://fastly.jsdelivr.net/gh/Achuan-2/siyuan-plugin-blockref-footnote/CHANGELOG.md)

## 📝插件设置

> 思源笔记使用本插件的版本要求：>v3.1.13

**本插件支持高度自定义化，支持的设置如下：**

* **脚注存放设置**

  * **脚注存放位置**：可以设置脚注存放在当前文档、指定文档、子文档、父块后。默认为 `当前文档`
  * **指定文档的文档ID** ：当脚注存放位置为“指定文档”时，设置某个文档存放所有的脚注
  * **当前文档的脚注容器标题**：当脚注存放位置为“当前文档”时，设置存放脚注的标题
  * **指定文档的脚注容器标题**：当脚注存放位置为“指定文档”时，设置存放脚注的标题。
  * **子文档的脚注容器标题**：当脚注存放位置为“子文档”时，设置存放脚注的文档标题名
  * **是否自动更新脚注容器标题**：每次创建脚注是否会自动更新脚注容器标题符合设置的模板
  * **插入脚注的顺序**：顺序或者倒序。默认：`顺序`
* **脚注样式设置**

  * **脚注引用样式**：脚注引用的样式：“块引”或“块链接”。默认：`块引`
  * **脚注块引锚文本**：设置脚注引用的锚文本。默认：`[注]`
  * **选中文本的样式**：选择无样式或自定义样式。默认：`无样式`。
  * **脚注自动数字编号**：使用数字编号（如[1], [2]等）替代自定义锚文本。开启后每次新建和删除脚注会自动对所有脚注重新排序编号。注意：目前开启此项，当脚注数量越多，排序耗时越长，介意请勿开启。
  * **脚注内容模板**：设置生成脚注内容的样式，推荐使用嵌套引述块或超级块来存放脚注内容，保证脚注内容属于同一个块，`${selection}`代表选中文本的富文本内容，`${selection:text}`代表选中文本纯文本内容，`${content}`代表脚注内容占位，`${refID}`代表选中文本所在的块的ID，`${index}`脚注编号默认带原块链接，`${index:text}`脚注编号纯文本。另外可以使用kramdown语法设置脚注内容块的块样式。默认：
    ```markdown
    {{{col
    ${index}
    {: style="width: 2.5em; flex: 0 0 auto;"}

    {{{row
    > ${selection}

    ${content}
    }}}
    }}}
    ```
  * **脚注内容块的别名**：设置脚注内容块的别名，提示这个块是脚注内容，设置为空则不设置别名。默认为空。
  * **自定义样式**：自定义脚注块引、添加脚注时选中文字的样式、脚注内容块的样式。默认：
    ```css
    /* 自定义脚注引用样式 */
    .protyle-wysiwyg [data-node-id] span[custom-footnote],
    .protyle-wysiwyg [data-node-id] span[data-type*="block-ref"][custom-footnote],
    .protyle-wysiwyg [data-node-id] span[data-ref*="siyuan://blocks"][custom-footnote] {
        background-color: var(--b3-font-background5) !important;
        color: var(--b3-theme-on-background) !important;
        border: none !important;
        margin: 0 1px;
        border-radius: 3px;
    }
    /* 自定义选中文本样式 */
    .protyle-wysiwyg [data-node-id] span[data-type*="custom-footnote-selected-text"] {
        border-bottom: 2px dashed var(--b3-font-color5);
    }

    /* 自定义脚注内容块样式 */
    /* 脚注内容块如果设置为横排超级块则减少间距 */
    .protyle-wysiwyg .sb[custom-plugin-footnote-content][data-sb-layout=col] {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        column-gap: 0em;
    }
    /* 脚注内容块设置字体样式 */
    /*.protyle-wysiwyg [data-node-id][custom-plugin-footnote-content] {
        font-size: 0.8em;
        color: var(--b3-font-color5);
    }*/
    ```
* **重置设置**：重置插件设置为默认值

## ⚡插件命令面板

打开命令面板

目前已有的命令如下：

- 添加脚注：添加脚注到当前文档（可以不选择文字添加）
- 脚注编号：将当前文档的所有脚注转换为数字编号样式
- 脚注取消编号：将当前文档的所有脚注转换为自定义锚文本样式
- 隐藏选中文本的样式：将当前文档的所有添加脚注时选中的文本自定义样式隐藏
- 显示选中文本的样式：将当前文档的所有添加脚注时选中的文本自定义样式显示

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-12-08_16-59-02-2024-12-08.png)

可在设置中自行绑定快捷键：

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-12-08_16-59-35-2024-12-08.png)

## 🤔插件使用介绍

### 如何同时删除脚注引用和脚注内容块

插件支持同时删除脚注引用和脚注内容，可以在脚注引用右键菜单，点击【插件-删除脚注】

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-18_16-39-18-2024-11-18.png)

### 如何对同一个文本进行多次备注

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/%E6%80%9D%E6%BA%90%E7%AC%94%E8%AE%B0%E8%84%9A%E6%B3%A8%E6%8F%92%E4%BB%B6%E6%94%AF%E6%8C%81%E5%AF%B9%E5%90%8C%E4%B8%80%E4%B8%AA%E6%96%87%E6%9C%AC%E8%BF%9B%E8%A1%8C%E5%A4%9A%E6%AC%A1%E5%A4%87%E6%B3%A8-2024-11-19.gif)

### 如何修改脚注内容块的模板

「**脚注内容模板」** 能设置生成脚注内容的样式，推荐使用嵌套引述块或超级块来存放脚注内容，保证脚注内容属于同一个块。

插件还提供了变量，可以通过变量自由设置脚注内容块的排版样式：

* `${selection}`代表选中文本的富文本内容，`${selection:text}`代表选中文本纯文本内容
* `${content}`代表脚注内容占位
* `${refID}`代表选中文本所在的块的ID
* `${index}`脚注编号默认带原块链接，`${index:text}`脚注编号纯文本，不开启脚注编号功能，为固定文本，中文默认为[注]，英文为[*]

下面列举一些用户可能用到的模板

* 脚注内容为单个块

  ```markdown
  ${content}
  ```
* 脚注内容用超级块包裹，这样脚注内容可以是多个块！可以添加更多内容

  ```markdown
  {{{row
  ${content}
  }}}
  ```
* 超级块添加选中的文本，另外添加跳转回原块的链接

  ```markdown
  {{{row
  > ${selection} [[↩️]](siyuan://blocks/${refID})

  ${content}
  }}}
  ```
* 嵌套引述块

  ```markdown
  >> ${selection} [[↩️]](siyuan://blocks/${refID})
  >> 
  > 💡${content}
  ```
* 使用列表项存放引用原块的块引，锚文本为选中文字，可以在当前文档的反链面板查看所有脚注

  ```markdown
  - ((${refID} "${selection:text}"))

    {{{row
    ${content}
    }}}
  ```

- 插件还可以使用kramdown语法设置脚注内容块的块样式。例如：我用该语法为超级块添加虚线框样式

  ```markdown
  {{{row
  > ${selection} [[↩️]](siyuan://blocks/${refID})

  ${content}
  }}}
  {: style="border: 2px dashed var(--b3-border-color);"}
  ```
- 插件也支持用 `${...}`来渲染sprig语法。比如你可以用下面的方法插入当前时间

  ```markdown
  >> ${{now | date "20060102 15:04:05"}} 摘抄
  >> ${selection} [[↩️]](siyuan://blocks/${refID})
  >> 
  > 💡${content}
  ```

### 如何自定义脚注样式

插件添加的内容都含有自定义属性

* 脚注引用：`span[custom-footnote]`
* 脚注内容块：`div[custom-plugin-footnote-content]`
* 如果设置了选中文本的样式为自定义样式，添加脚注时选中的文本有：`span[data-type*="custom-footnote-selected-text"]`

根据自定义属性，使用css代码即可针对性修改插件添加的内容样式

例如：

自定义脚注引用修改为：绿色背景，绿色文字颜色。

```
/* 自定义脚注引用样式 */
.protyle-wysiwyg [data-node-id] span[custom-footnote],
.protyle-wysiwyg [data-node-id] span[data-type*="block-ref"][custom-footnote],
.protyle-wysiwyg [data-node-id] span[data-ref*="siyuan://blocks"][custom-footnote] {
    /* 设置背景色 */
    background-color: var(--b3-card-success-background);
  
    /* 设置文字颜色 */
    color: var(--b3-card-success-color) !important;
  
    /* 移除边框 */
    border: none!important;
  
    /* 设置左右外边距 */
    margin: 0 1px;
  
    /* 设置圆角 */
    border-radius: 3px;
}
```

自定义脚注内容块：设置字体大小为0.8em，字体颜色为灰色

```
/* 自定义脚注内容块样式 */
.protyle-wysiwyg [data-node-id][custom-plugin-footnote-content] {
    /* 设置字体大小 */
    font-size: 0.8em;
  
    /* 设置文字颜色 */
    color: var(--b3-font-color5);
}
```

## 🙏致谢

* [https://github.com/zxhd863943427/siyuan-plugin-memo](https://github.com/zxhd863943427/siyuan-plugin-memo)：基于该插件进行改进，添加了更多功能和配置项
* [https://github.com/siyuan-note/plugin-sample-vite-svelte](https://github.com/siyuan-note/plugin-sample-vite-svelte)：使用的插件模板，大幅提高开发效率
* [Wetoria (Vip)](https://github.com/Wetoria) 的插件开发指导

## ❤️ 用爱发电

穷苦研究生在读ing，如果喜欢我的插件，欢迎给GitHub仓库点star和捐赠，这会激励我继续完善此插件和开发新插件。

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20241118182532-2024-11-18.png)

> 2024.11.20 感谢muhaha捐赠¥30
>
> 2024.11.27 感谢若为雄才捐赠¥1
>
> 2024.11.28 感谢sweesalt捐赠¥20
>
> 2024.11.30 感谢赐我一月半捐赠¥10
