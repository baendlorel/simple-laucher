根据现在的package.json里的configuration字段来编写package.nls.json和package.nls.zh-cn.json内容。

1、参考src/types/index.ts中的注释；
2、对于simple-launcher.load-from，package.json的描述要表达出：从scripts字段读取，key为displayname，value为command；
对于Cargo.toml，描述要表达出：从[workspace]读取，然后从workspace 的路径访问到子包路径下的Cargo.toml，并从中读取到[package]name字段。这时displayname为[package]name，command为cargo run --bin [package]name。
