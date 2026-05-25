根据现在的package.json里的configuration字段来编写package.nls.json和package.nls.zh-cn.json内容。

1、参考src/types/index.ts中的注释；
2、对于simple-launcher.load-from，package.json的描述要表达出：从scripts字段读取，key为displayname，value为command；
对于Cargo.toml，描述要表达出：从[workspace]读取，然后从workspace 的路径访问到子包路径下的Cargo.toml，并从中读取到[package]name字段。这时displayname为[package]name，command为cargo run --bin [package]name。

---

现在我需要你开发一个命令：
1. 命令ID为simple-launcher.import-commands，我已经在package.json里创建好了；
2. 这个命令会打开一个config-panel的webview。里面会有从配置文件导入命令的功能，只支持package.json和cargo.toml两种\
3. 从xxx导入命令是一个collapse面板，点击后会出现详细的选择配置，包括直接展示出所有扫描到的文件，比如package.json里的命令以及子包里的命令，Cargo.toml及其子包所转化成的命令。
4. cargo.toml的读取方式已经完整，在config.ts里；
5. package.json的读取方式还不够完整，需要你加入对pnpm workspace的读取，进一步读取到子包的package.json中的scripts字段，并以pnpm --filter 。。的格式来注入命令。
6. 扫描根目录以获取到这些脚本的信息。
7. 将这些命令信息都展示在collapse展开后的面板中，前面时checkbox，表示可以选择它们。可以一键全选。点击确认后，被选中的可以被导入进来。
8. 导入完成后，collapse面板收起，展示出真正的编辑命令的界面。
9. 每一条命令都有三个输入框，一个显示displayName、一个显示command、一个显示monitorTarget。用户可以修改这些内容，按ctrl+s可以保存。并且顶部也有蓝色的保存按钮，写着"Save (Ctrl+S)"。
10. 保存后这些内容会调用config里的save进行保存。
11. panel的模板使用src/template/config-panel.html。