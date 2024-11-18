
## ✨Features

Implement footnotes and remarks using SiYuan's blockref.

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/思源笔记脚注插件2-2024-11-18.gif)

> Using the Tsundoku theme for demonstration, the style of nested blockquote has been optimized.

## 📝Usage Instructions

**Settings**

Here's the translation of the provided text into English:

- **Footnote  Location**: You can set the storage location to be in the current document or a specified document. The default is `Current Document`.
- **Selected Text Style**: You can choose styles such as bold, highlight, italic, or underline for the selected text. The default style is `None`.
- **Order of Inserting Footnotes**: ascending  or descending order. The default is `ascending `.
- **Footnote Title**: Set the title for storing footnotes. The default is `Footnote`.
- **Footnote Anchor Text**: Set the anchor text for footnote references. The default is `Footnote`.
- **Footnote Template**: Set the template for footnotes. It is recommended to use a blockquote or superblock combination to ensure the input content belongs to the same block. The default is a nested blockquote template, which can be changed. `${selection}` represents the content of the selected text, and `${content}` represents the placeholder for footnote content.
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

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-18_16-23-41-2024-11-18.png)

To simultaneously delete footnote references and footnote content, you can right-click on the footnote reference and select [Plugin - Delete Footnote] from the menu.
![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-18_16-24-25-2024-11-18.png)


## 🙏 Acknowledge

- https://github.com/zxhd863943427/siyuan-plugin-memo
- https://github.com/siyuan-note/plugin-sample-vite-svelte



## ❤️ Donation
A poor graduate student in the process of studying. If you like my plugin, feel free to buy me a pack of spicy strips. This will motivate me to continue improving this plugin and developing new ones.

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20241118182532-2024-11-18.png)