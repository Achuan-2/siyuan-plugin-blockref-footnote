## ✨Features

Implement footnotes and remarks function using SiYuan's blockref.

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/%E6%80%9D%E6%BA%90%E7%AC%94%E8%AE%B0%E8%84%9A%E6%B3%A8%E6%8F%92%E4%BB%B62-2024-11-18.gif)

> Using the Tsundoku theme for demonstration, the style of nested blockquote has been optimized.

## 📝Usage Instructions

> The minimum required version of Siyuan Notes for this plugin is v3.1.12.

**Settings**

- **Footnote  Location**: You can set the storage location to be in the current document or a specified document. The default is `Current Document`.
- **Selected Text Style**: You can choose styles such as bold, highlight, italic, or underline for the selected text. The default style is `None`.
- **Order of Inserting Footnotes**: ascending  or descending order. The default is `Ascending` .
- **Footnote Title**: Set the title for storing footnotes. The default is `Footnote`.
- **Footnote Anchor Text**: Set the anchor text for footnote references. The default is `[Footnote]`.
- **Footnote Template**: Set the template for footnotes. It is recommended to use a blockquote or superblock combination to ensure the input content belongs to the same block.  `${selection}` represents the content of the selected text, and `${content}` represents the placeholder for footnote content. And you can use kramdown syntax to define block styles.

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
    {: style="border: 2px dashed var(--b3-border-color);"}
    ```





![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-18_16-23-41-2024-11-18.png)

To simultaneously delete footnote references and footnote content, you can right-click on the footnote reference and select `[Plugin -> Delete Footnote]` from the menu.

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-18_16-24-25-2024-11-18.png)

## 📝CHANGELOG

See [CHANGELOG.md](CHANGELOG.md)

## 🙏 Acknowledge

- [https://github.com/zxhd863943427/siyuan-plugin-memo](https://github.com/zxhd863943427/siyuan-plugin-memo)
- [https://github.com/siyuan-note/plugin-sample-vite-svelte](https://github.com/siyuan-note/plugin-sample-vite-svelte)

## ❤️ Donation

A poor graduate student in the process of studying. If you like my plugin, feel free to buy me a pack of spicy strips. This will motivate me to continue improving this plugin and developing new ones.

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20241118182532-2024-11-18.png)