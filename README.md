# wpack-dll-demo

### 认识 DLL

动态链接库，Dynamic-link library，缩写为 **DLL**。

库就是写好的现有的，成熟的，可以复用的代码。**现实中每个程序都要依赖很多基础的底层库，不可能每个人的代码都从零开始，因此库的存在意义非同寻常**。

库有两种：

- 静态链接库
    - Windows 中是以 `.lib` 为后缀，Linux中是以 `.a` 为后缀。
    -  当同时运行多个程序并且都使用到同一个函数库的函数时，内存中就会有同一函数的**多份副本**，会消耗大量宝贵的内存。【编译时加载】
- 动态链接库
    - Windows 中是以 `.dll` 为后缀，Linux中是以 `.so` 为后缀。
    - 当一个程序使用共享函数库时，程序本身不再包含函数代码，而只是**引用**共享代码，当实际调用时，共享库才被加载到内存中。【运行时加载】



---

### webpack dll 优化技术

webpack4+，不适用于小于 4 的版本，也不需要去了解了（BTW，webpack4 的打包优化已经不需要 dll 技术了，使用和不使用的提升不再明显。反而是webpack4以下版本的真正的需要 dll 技术）。

#### 优化效果（目的）

提升打包速度，缩小打包文件的体积。



#### 前端项目接入动态链接库

- 把基础模块抽离出来，打包到一个个单独的动态链接库中，一个动态链接库可以包含多个模块。
- 当需要导入的模块存在于某个动态链接库中时，这个模块不会被再次打包，而是去动态链接库中获取。例如 react、react-dom，只要不升级这些模块的版本，动态链接库就不用重新编译。
- 页面依赖的所有动态链接库都需要被加载。



#### 接入 Webpack

Webpack 内置了对动态链接库的支持，需要通过2个内置的插件接入：

- DllPlugin 插件，用于打包出一个个单独的动态链接库文件。
- DLLReferencePlugin 插件，在主要配置文件中引入 DllPlugin 插件打包好的动态链接库文件。

> 动态链接库文件相关的文件需要由一份独立的构建输出，用于给主构建使用。新建一个 Webpack 配置文件 webpack_dll.config.js 专门用于构建它们。



##### 1. 构建动态链接库文件的配置文件

webpack_dll.config.js：

```js
const path = require('path');
const DllPlugin = require('webpack/lib/DllPlugin');

module.exports = {
  // JS 执行入口文件
  entry: {
    // 把 React 相关模块的放到一个单独的动态链接库
    react: ['react', 'react-dom'],
    // 把项目需要所有的 polyfill 放到一个单独的动态链接库
    polyfill: ['core-js/features/object/assign', 'core-js/features/promise','whatwg-fetch'],
  },
  output: {
    // 输出的动态链接库的文件名称，[name] 代表当前动态链接库的名称，
    // 也就是 entry 中配置的 react 和 polyfill
    filename: '[name].dll.js',
    // 输出的文件都放到 dist 目录下
    path: path.resolve(__dirname, 'dist'),
    // 存放动态链接库的全局变量名称，例如对应 react 来说就是 _dll_react
    // 之所以在前面加上 _dll_ 是为了防止全局变量冲突
    library: '_dll_[name]',
  },
  plugins: [
    // 接入 DllPlugin
    new DllPlugin({
      // 动态链接库的全局变量名称，需要和 output.library 中保持一致
      // 该字段的值也就是输出的 manifest.json 文件中 name 字段的值
      // 例如 react.manifest.json 中就有 "name": "_dll_react"
      name: '_dll_[name]',
      // 描述动态链接库的 manifest.json 文件输出时的文件名称
      path: path.join(__dirname, 'dist', '[name].manifest.json'),
      // Webpack5 默认 entryOnly 为 true
      // entryOnly: true,
    }),
  ],
};
```

- `entryOnly`  这个配置项需要单独说一下，Webpack5 已经将这个配置的默认值设置为 `true`。

  如果设置为 `false`，将分包资源打入 dll bundle 时，会存在将全局方法打入分包 dll 中的可能性，这样主包在使用该方法被映射到 dll bundle 中时，会因为分包未加载而报错。

- 在该配置文件中，DllPlugin 中的 `name` 参数必须和 `output.library` 中保持一致。



##### 2. 在 Webpack 主配置文件中使用 Dll 文件

```js
// ...
const DllReferencePlugin = require('webpack/lib/DllReferencePlugin');

module.exports = {
  // ...
  plugins: [
    // ...
    new DllReferencePlugin({
      manifest: require('./dist/react.dll.js'),
    }),
    new DllReferencePlugin({
      manifest: require('./dist/polyfill.dll.js'),
    }),
  ],
};
```

通过内置的插件 `DllReferencePlugin` 配置，webpack 已经知道哪些库已经被 dll 打包过了，之后的打包就不会再进行打包，而是用 dll 打包出来的映射表文件（如 react.manifest.json）。

现在webpack打包的时候已经会取 dll 文件了，但是这些 dll 包还没有被引入到项目中，如下图所示，现在打包出的 index.html 中只引入了 main.js。

![](https://cdn.jsdelivr.net/gh/iotale/pic@master/uPic/0ykmih.png)

这里需要借助 add-asset-html-webpack-plugin 将 dll 文件插入到 index.html 中，来达到全局变量的效果（暴露在Window下）。

> The plugin will add the given JS or CSS file to the files Webpack knows about, and put it into the list of assets `html-webpack-plugin` injects into the generated html.

需要注意：webpack4+ 在使用 add-asset-html-webpack-plugin 插件的时候，必须放在 html-webpack-plugin 插件后面实例化，因为前者依赖后者的 html-webpack-plugin-before-html-generation 的钩子方法。

```js
...
const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin');

module.exports = {
    ...,
    plugins: [
        ...,
        // 该插件将把给定的 JS 或 CSS 文件添加到 webpack 配置的文件中，并将其放入资源列表 html webpack插件注入到生成的 html 中。
        new AddAssetHtmlPlugin([
            {
                // 要添加到编译中的文件的绝对路径，以及生成的HTML文件。支持globby字符串
                filepath: '...',
                // 文件输出目录
                outputPath: 'dist',
                // 脚本或链接标记的公共路径
                publicPath: './'
            }
        ])
    ]
}
```

再次打包后：

![image-20211202135705761](https://cdn.jsdelivr.net/gh/iotale/pic@master/uPic/image-20211202135705761.png)



##### 3. 执行构建

- 先编译出动态链接库以供主打包文件中的 `DLLReferencePlugin` 使用
- 执行主要编译



##### 4. 线上CI构建

- 第一次构建的时候，执行 dll 构建，打包出动态链接库文件，将动态链接库文件放入 Runner 的缓存目录下
- 在主要构建中使用动态链接库文件。

主要问题是，如何在后续的 CI 中判断需不需要更新 Dll 文件。（目前无解决，可以去找找）。



##### 5. 打包对比（webpack4.46）

不使用 dll 打包的时候，差不多2.4秒，使用了 dll 后，打包时间可以到 1 秒左右（无论是使用 DllPlugin 还是使用 autodll-webpack-plugin 效果差不多）。

> PS: 使用 Webpack5 的时候 dll 的效果不是那么明显了。



#### DllPlugin 中的 `name` 参数必须和 `output.library` 中保持一致

这个需要知道 dll 是如何工作的。我们可以通过打包出的文件反向推断：

通过下图知道，dll 打包出来的文件之间的联系：动态链接库暴露出全局变量`_dll_react` ，同时生成 react.manifest.json 文件，而 react.manifest.json 访问的刚好就是全局变量 `_dll_react`。这样 webpack 打包的时候只需要访问 react.manifest.json 就可以访问到 react 和 react-dom 了。

![](https://cdn.jsdelivr.net/gh/iotale/pic@master/uPic/pPlURR.png)

看下 DLLReferencePlugin  的配置就知道了

![image-20211202134704200](https://cdn.jsdelivr.net/gh/iotale/pic@master/uPic/image-20211202134704200.png)



---

### 使用 autodll-webpack-plugin 代替 DllPlugin

使用 autodll-webpack-plugin 来代替 DllPlugin 和 DllReferencePlugin, 实际内部只是将上面那些略显繁琐的配置给整合了一下。解放了开发者的配置负担：

- 之前的 webpack_dll.config.js 文件不再需要

- 主配置文件中删除的 DllReferencePlugin 和 AddAssetHtmlPlugin 插件的引用，添加 autodll-webpack-plugin 插件的引用：

  ```js
  const path = require('path');
  // ...
  const AutoDllPlugin = require('autodll-webpack-plugin');
  module.exports = {
    // ...
    plugins: [
      // ...
      new AutoDllPlugin({
        inject: true, // 设为 true 会把 Dll bundles 插到 index.html 里
        filename: '[name].dll.js',
        context: path.resolve(__dirname, '..'), // AutoDllPlugin 的 context 必须和 package.json 的同级目录，要不然会链接失败
        entry: { // 对应 webpack_dll.config.js 配置文件中的 entry
          react: [
            'react',
            'react-dom',
          ],
          // ...
        },
      }),
    ],
  };
  ```

看下构建出的产物：

![image-20211202150347072](https://cdn.jsdelivr.net/gh/iotale/pic@master/uPic/image-20211202150347072.png)

> 没有 manifest 的映射文件了
