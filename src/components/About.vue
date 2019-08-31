<template>
  <div style="text-align: left;">
    <h2>一、模块说明</h2>
    <p>此工具用于计算海量回溯数据的曝光量，共包含 3 个功能模块：</p>
    <ol>
      <li>计算 —— 根据回溯后得到的 data 表和 dpt 表，计算曝光量；</li>
      <li>查询 —— 查询数据库中是否存在某个主域名的有效记录，返回该主域名及其子域名的详情；</li>
      <li>添加/更新 —— 往数据库添加或更新某个主域名，数据来自 Alexa 和百度。</li>
    </ol>
    <h2>二、操作说明</h2>
    <h3>（一）计算</h3>
    <ol>
      <li>在海量执行回溯任务，得到 data 表和 dpt 表；</li>
      <li>【必须】<span class="warn">删除 data 表中的 format_content 和 content 字段</span>，不删除的话有可能内存不足导致程序崩溃，除此以外不要再对数据表做任何改动；</li>
      <li>分别选中要计算的 data 表和 dpt 表，如果文件名和文件大小符合要求，【开始】按钮就会变成可用状态，点击后开始解析和计算，其中解析 data 表和计算 source_type = 0,1,2,3,5,6 的曝光量耗时最久，请耐心等待，计算过程中会提示有哪些主域名在数据库中不存在有效记录；</li>
      <li>计算完成后，【导出】按钮会变成可用状态，点击后会自动触发下载计算结果，文件为 <strong>impress_时间戳.xlsx</strong> ，其中 impress 字段即为计算的曝光量，可通过 url_crc 匹配。</li>
    </ol>
    <h3>（二）查询</h3>
    <p>分清楚什么叫主域名和子域名就行，怎么用不需要说了。</p>
    <br>
    <h3>（三）添加/更新</h3>
    <p>上面【计算】过程中会提示某些主域名不在数据库中，可以手动添加进去，或者某个主域名的数据想更新下也可以操作，会直接覆盖旧的数据：</p>
    <ol>
      <li>登录 <a href="http://www.alexa.cn/traffic/" target="_blank">Alexa</a> ，输入要添加的主域名进行查询，如果不知道哪个才是主域名，可以直接丢链接进去，Alexa 会进行提取；</li>
      <li>查询结果中【网站流量】的 PV 是第一个需要的数据，优先级上 <strong>三月平均 > 月平均 > 周平均 > 当日</strong>，四个数据都为 0 的话基本这就是个垃圾网站，直接无视；</li>
      <li>查询结果中【下属站点】是第二个需要的数据，直接整块复制下来，<strong>注意不包含表头</strong>；</li>
      <li>以上两个数据加上主域名，填到相应的输入框中，【提交】按钮会变为可用状态，点击后会进行预处理然后发送给后端，如果子域名比较多，时间可能长达 1 分钟，请耐心等待，处理完会提示提交结果。</li>
    </ol>
    <img src="../assets/upsert.png">
  </div>
</template>

<script>
export default {
  name: 'About'
}
</script>

<style scoped>
ol {
  margin-bottom: 32px;
}
li {
  margin-bottom: 12px;
}
.warn {
  color: rgb(255, 0, 0);
  font-weight: bold;
}
</style>
