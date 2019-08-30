<template>
  <div style="text-align: left;">
    <div>
      <p><strong>主域名</strong></p>
      <a-input
        placeholder="如 qq.com，如果不确定哪个是主域名，请以 alexa 上显示的为准"
        v-model="domain"
      />
    </div>
    <div style="margin-top: 36px;">
      <p><strong>网站流量</strong></p>
      <a-input
        type="number"
        placeholder="请填入网站 PV，优先级：三月平均 > 月平均 > 周平均 > 当日"
        v-model="pv"
      />
    </div>
    <div style="margin: 36px 0 18px 0;">
      <p><strong>下属站点</strong></p>
      <a-textarea
        placeholder="请粘贴下属站点流量数据（注意不包括表头）"
        :rows="6"
        v-model="subsText"
        />
    </div>
    <p>注意：如果下属站点较多，处理时间可能长达 1 分钟，<strong>请耐心等待，不要刷新页面</strong></p>
    <div class="row-center">
      <a-button
        type="primary"
        @click="submit"
        :disabled="domain && subsText? false : true"
        :loading="loading"
      >
        <a-icon type="rocket" />提交
      </a-button>
      &nbsp;&nbsp;&nbsp;&nbsp;
      <a-button
        @click="reset"
        :disabled="domain && subsText ? false : true"
      >
        <a-icon type="hourglass" />重置
      </a-button>
    </div>
  </div>
</template>

<script>
import qs from 'qs';
export default {
  name: 'Admin',
  data () {
    return {
      domain: '',
      pv: '',
      subsText: '',
      loading: false
    }
  },
  methods: {
    check (subs) {
      const subsFlag = subs.every(i => i.length == 4 && !isNaN(parseFloat(i[3])));
      const domainFlag = subs[0][0].indexOf(this.domain) == -1 ? false : true;

      if (!subsFlag) {
        this.$message.error('下属站点内容格式错误，请参考说明重新操作');
        return false;
      } else if (!domainFlag) {
        this.$message.error('主域名与下属站点不匹配');
        return false;
      } else {
        return true;
      }
    },
    async submit () {
      this.loading = true;
      const subs = this.subsText.split('\n').map(i => {
        return i.trim().split('\t');
      });

      if (this.check(subs)) {
        const cleanSubs = subs.map(i => `${i[0]}#${i[3]}`);
        const data = {
          domain: this.domain,
          pv: this.pv,
          subs: cleanSubs
        };
        const options = {
          url: 'https://nr-impress.herokuapp.com/domain',
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          data: qs.stringify(data, {arrayFormat: 'comma'})
        };

        try {
          const result = await this.$ax(options);
          this.loading = false;
          const resultData = result.data;
          if (result.status == 200) {
            this.$message.info(resultData.msg);
          } else {
            this.$message.error(resultData.msg);
          }
        } catch (err) {
          this.handleError(err, '提交请求失败');
        }
      } else {
        this.loading = false;
      }
    },
    reset () {
      this.domain = '';
      this.pv = 0;
      this.subsText = '';
    },
    handleError (err, msg) {
      window.console.log(err);
      this.$message.error(msg);
      this.loading = false;
    }
  }
}
</script>

<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
