# TODO

- [ ] 参考其他插件，对设置界面进行优化
  - [ ] https://github.com/Zuoqiu-Yingyi/siyuan-plugin-custom-block/blob/main/src/components/Settings.svelte
    - [ ] 重置按钮并刷新思源
    - [ ] 多个设置项分组
  - [ ] svelte可以做到我选项1选择的是x的时候，选项2 textinput就不显示吗
    ```
      <script>
      let selection = ''; // 存储选项1的值
    </script>

    <div>
      <label>
        选项1:
        <select bind:value={selection}>
          <option value="">请选择</option>
          <option value="x">X</option>
          <option value="y">Y</option>
        </select>
      </label>

      {#if selection === 'y'}
        <div>
          <label>
            选项2:
            <input type="text" />
          </label>
        </div>
      {/if}
    </div>
    ```
- [ ] 支持数字编号
  - [ ] 思路：添加一个命令，把当前文档的脚注转化为数字编号，考虑到思源的动态加载机制，应该是把当前文档导出kramdown文本，直接对kramdown进行处理。注意，导出kramdown需要用span样式（https://github.com/siyuan-note/siyuan/issues/13183）
    1. 首先先用正则搜索形如`<sup>((20241118190709-lx2usll "注"))</sup>{: style="--memo: 1"}`的块引，根据搜索，获取每个被引用的块id，考虑到可能会存在重复，只考虑这个id在整个文档第一次出现的顺序进行排序。排序后将块引中的`"注"`改为单引号包裹的对应块id的序号（思源笔记kramdown语法单引号代表动态锚文本）。
    2. 把脚注引用变为动态锚文本（块引由原来的s改为d）
- [ ] 需要改进下如何做到选择同一文本，如果已经有脚注了，脚注块引应该放在最后，而不是放在最前
  - [ ] 用protyle.insert 插入块引（不需要了，因为插入块引不需要有选中文本，用setInlineMark就行）
  - [ ] 需要获取range的位置，然后根据位置判断是否有脚注，如果有脚注，就插入在脚注后面
  - [ ] 不过也可以选中全部文本，插入脚注，不过获取的selection文本需要排除已经添加的脚注，这样更简单一点，也更加自由，只需要对selection文本进行处理，这个应该是好处理的
  - [ ] 如果选中的文本末尾不包含脚注，则应该新增的脚注要放在所有脚注后面，如果选中的文本末尾包含脚注，就直接放到当前选中文本的后面，这样就非常自由
- [ ] 优化导出到微信公众号
  - [ ] 去除脚注块引锚文本，只保留导出
  - [ ] 不导出脚注内容，只显示思源的脚注
- [ ] 自定义选中文本的样式
  - [ ] 参考<https://github.com/zxhd863943427/siyuan-plugin-memo>，添加css样式