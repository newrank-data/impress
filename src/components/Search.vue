<template>
  <div>
    <a-input-search
      placeholder="请输入要查询的主域名，如 qq.com"
      @search="onSearch"
      enterButton="查询"
    />
    <div style="margin-top: 24px;">
      <a-table :columns="columns"
        :rowKey="record => record.subdomain"
        :dataSource="subs"
        :pagination="false"
        :scroll="{ y: 380 }"
        :loading="loading"
      >
        <template slot="title">
          <h3>{{`主域名：${domain}  |  总 PV：${pv}`}}</h3>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script>
const columns = [{
  title: '子域名',
  dataIndex: 'subdomain',
  width: 190
}, {
  title: 'PV 占比（%）',
  dataIndex: 'ratio',
  width: 130
}, {
  title: 'PV',
  dataIndex: 'pv',
  width: 100
}, {
  title: '百度收录数',
  dataIndex: 'record',
  width: 110
}, {
  title: '相对系数',
  dataIndex: 'factor',
  width: 110
}, {
  title: '链接数',
  dataIndex: 'link',
  width: 80
}, {
  title: '曝光量',
  dataIndex: 'impress',
  width: 80
}];
export default {
  name: 'Search',
  data () {
    return {
      domain: '',
      loading: false,
      columns,
      pv: 0,
      subs: []
    }
  },
  methods: {
    async onSearch (domain) {
      this.loading = true;
      const url = `https://nr-impress.herokuapp.com/domain/${domain.trim()}`;
      try {
        const result = await this.$ax(url);
        this.loading = false;
        const resultData = result.data;

        if (resultData.data) {
          this.domain = resultData.data.domain;
          this.pv = resultData.data.pv;
          this.subs = resultData.data.subs;
        } else {
          this.$message.error(resultData.msg);
        }
      } catch (err) {
        this.$message.error('查询请求失败');
        this.spinning = false;
      }
    }
  }
}
</script>