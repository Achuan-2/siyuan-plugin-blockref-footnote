## ✨Features

Implement footnotes and remarks function using SiYuan's blockref.

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/%E6%80%9D%E6%BA%90%E7%AC%94%E8%AE%B0%E8%84%9A%E6%B3%A8%E6%8F%92%E4%BB%B62-2024-11-18.gif)

> Using the Tsundoku theme for demonstration, the style of nested blockquote has been optimized.

## 📝Usage Instructions

> The minimum required version of Siyuan Notes for this plugin is v3.1.13.

**This plugin supports high customization with the following settings:**

- **Footnote Storage Settings**
  - **Footnote Location**: You can set footnotes to be stored in the current document, specified document, sub-document, or after parent block. Default is `Current Document`.
  - **Document ID for Specified Document**: When footnote location is "Specified Document", set a document to store all footnotes.
  - **Container Title in Current Document**: When using current document storage, set the h2 heading for footnotes.
  - **Container Title in Specified Document**: When using specified document storage, set the h2 heading for footnotes.
  - **Container Title in Sub-document**: When using sub-document storage, set the document title for footnotes.
  - **Auto Update Container Title**: Whether to automatically update the container title to match template settings when creating footnotes.
  - **Footnote Insertion Order**: Ascending or descending order, default: `Ascending`.

- **Footnote Style Settings**
  - **Reference Style**: Choose between "Block Reference" or "Block Link".
  - **Reference Anchor Text**: Set the anchor text for footnote references, default: `[Note]`.
  - **Selected Text Style**: Choose between no style or custom style, default: `No Style`. Note: For overlapping text footnotes, disable custom styling to avoid conflicts.
  - **Footnote Content Template**: Set template for footnotes using nested quotes or super blocks. Variables: `${selection}` (selected text), `${content}` (footnote content), `${refID}` (block ID). Supports kramdown syntax for block styling.

    - Nested Quote Template:
    ```markdown
    >> ${selection} [[↩️]](siyuan://blocks/${refID})
    >> 
    > 💡${content}
    ```

    - Vertical Super Block Template:
    ```markdown
    {{{row
    > ${selection} [[↩️]](siyuan://blocks/${refID})
    
    ${content}
    }}}
    {: style="border: 2px dashed var(--b3-border-color);"}
    ```

    - List Item Template with Backlinks:
    ```markdown
    -  ((${refID} "${selection}"))

      {{{row
      ${content}
      }}}
    ```

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-24_01-26-22-2024-11-24.png)

Supports simultaneous deletion of footnote references and content via right-click menu [Plugin -> Delete Footnote].

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/PixPin_2024-11-18_16-39-18-2024-11-18.png)

Supports multiple annotations for the same text.

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/%E6%80%9D%E6%BA%90%E7%AC%94%E8%AE%B0%E8%84%9A%E6%B3%A8%E6%8F%92%E4%BB%B6%E6%94%AF%E6%8C%81%E5%AF%B9%E5%90%8C%E4%B8%80%E4%B8%AA%E6%96%87%E6%9C%AC%E8%BF%9B%E8%A1%8C%E5%A4%9A%E6%AC%A1%E5%A4%87%E6%B3%A8-2024-11-19.gif)

## 🙏Acknowledgments 

- [https://github.com/zxhd863943427/siyuan-plugin-memo](https://github.com/zxhd863943427/siyuan-plugin-memo): Improved based on this plugin, adding more features and configuration options
- [https://github.com/siyuan-note/plugin-sample-vite-svelte](https://github.com/siyuan-note/plugin-sample-vite-svelte): Using this plugin template greatly improved development efficiency

## ❤️Donation

A poor graduate student in the process of studying. If you like my plugin, feel free to star the GitHub repository and donate. This will motivate me to continue improving this plugin and developing new ones.

![](https://fastly.jsdelivr.net/gh/Achuan-2/PicBed/assets/20241118182532-2024-11-18.png)

> 2024.11.20, thanks to muhaha for donating ¥30  
> 
> 2024.11.27, thanks to 若为雄才 for donating ¥1  
> 
> 2024.11.28, thanks to  sweesalt for donating ¥20  
> 
> 2024.11.30, thanks to 赐我一月半 for donating ¥10