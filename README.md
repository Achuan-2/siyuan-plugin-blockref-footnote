
## ✨Features

Implement footnotes and remarks using SiYuan's blockref.

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/思源笔记脚注插件-2024-11-18.gif)

## 📝Usage Instructions

**Settings**

- **Footnote Storage Location**: You can choose to store footnotes in the current document or a specified document, with the default being the current document.
- **Selected Text Style**: You can choose styles such as bold, highlight, italic, or underline for the selected text, with no style applied by default.
- **Footnote Insertion Order**: Choose between sequential or reverse order, with sequential being the default.
- **Footnote Template**: Set the template for footnotes. It is recommended to use a combination of quote blocks or super blocks to ensure the footnote content belongs to the same block. By default, a nested quote block template is used, which can be changed. `${selection}` represents the selected text, and `${content}` is a placeholder for the footnote content.

  - **Nested Quote Block Template**

    ```markdown
    >> ${selection}
    >> 
    > 💡${content}
    ```

  - **Vertical Super Block Combination Template**

    ```markdown
    {{{row
    > ${selection}
    
    ${content}
    }}}
    ```

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-18_14-10-26-2024-11-18.png)

## 🐛Known Issues

Applying styles like highlight or bold to selected text is not suitable for adding footnotes to the same text multiple times, as it will remove the previous styles.



## ❤️Acknowledge

- https://github.com/zxhd863943427/siyuan-plugin-memo