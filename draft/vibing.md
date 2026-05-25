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
12. 设置代码部分主要写在config.ts

==
更新需求：
1、不再扫描pnpm workspace了，而是直接扫描子包的package.json文件来获取命令信息。获取到之后同时记录它的路径，并为CommandConfig添加一个字段叫cwd，用于传入execSync参数；
2、直接进入子包扫描的时候，需要注意不要进入node_modules等不相关的目录；
3、当不存在时建议有意识返回null而不是undefined。
4、types里的类型文件直接用ts写，不要再用d.ts了。

==

1、cwd不要使用完整路径了，要使用相对与当前项目根目录的路径，避免泄露信息
2、删除simple-launcher.load-from配置和相关函数、机制，因为已经有了导入面板，不需要它了；
3、导入面板的ui，整体来说太宽松了，padding太大，需要更紧凑一点，这样显示更方便；
4、对于不存在的文件，比如如果没有cargo.toml或者package.json，建议在面板上就不显示了。如果两个都没，则只显示下方的编辑面板

==
让我们更换一种更好的模板替换方式：
1、在html里使用`"__variable-name.xxx__"`的方式来标记需要替换的变量，也就是整体是一个字符串；
2、用正则表达式匹配`/"__([a-z-.]+)__"/`，匹配出来的值实际上和l10n里的字段相同，这是为了可以方便查找；
3、replace 正则 + $1 ，替换

==
我精简了template的replace方式，你不用改回去。就在我的基础上进行：
1、初次进入导入界面，collapse面板默认展开；
 panel要有新增按钮，用于新增一行。如果当前的最后一行输入框全是空的，就不新增；
 允许删除一行
2、增加命令：config-panel为直接打开配置面板，同样是打开config-panel的webview但不进行扫描和导入，只做配置；
3、如果存在monitorTarget，则使用mem-use-ts包，每隔X秒钟获取一次监控目标的内存情况。规则如下：
  - 要在statusbarItem也就是marker上显示内存使用情况，格式为`{displayName}: {memoryUsage}`
  - 对getMemoryUsage函数返回的数组进行filter，如果不止一个，就求和，并显示为`{displayName}: {memoryUsage}({n} matched)`，其中n为filter后数组的长度；
  - 增加一个配置项，叫做monitor-interval，表示监控的时间间隔，单位为秒，默认值为3秒；
4、运行命令的方法是拉起一个终端并在其中执行命令，以方便用户Ctrl+C终止。并且重新运行命令的时候尽量复用它。
  - 在这个终端被终止的时候，statusbarItem上应该显示为`{displayName}: terminated`。终端相关内容写在core/terminal.ts里，整体可以到处一个函数，在register.ts里注册它