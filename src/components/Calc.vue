<template>
  <div>
    <div class="row-between">
      <a-upload
        name="t-data"
        accept=".xlsx"
        :showUploadList="false"
        :beforeUpload="() => false"
        @change="onDataFileChange"
      >
        <a-button>
          <a-icon type="file-excel" />选择 data 表
        </a-button>
        &nbsp;&nbsp;{{tDataInfo}}
      </a-upload>
      <a-button
        :disabled="!startReady"
        :loading="startLoading"
        @click="onStart"
      >
        <a-icon type="rocket" />开始
      </a-button>
    </div>
    <div class="row-between" style="margin-top: 4px;">
      <a-upload
        name="t-dpt"
        accept=".xlsx"
        :showUploadList="false"
        :beforeUpload="() => false"
        @change="onDptFileChange"
      >
        <a-button>
          <a-icon type="file-excel" />选择 dpt 表
        </a-button>
        &nbsp;&nbsp;{{tDptInfo}}
      </a-upload>
      <a-button
        :disabled="!exportReady"
        @click="onExport"
      >
        <a-icon type="export" />导出
      </a-button>
    </div>
    <ul id="logs" ref="logs">
      <li
        v-for="(log, idx) in logs"
        :class="{error: log.isErr}"
        :key="idx">{{log.text}}
      </li>
    </ul>
    <a-progress
      :percent="progressPercent"
      :status="progressStatus"
    />
  </div>
</template>

<script>
import XLSX from 'xlsx';
import { parse } from 'tldts';
const baseCols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

export default {
  name: 'Calc',
  data () {
    return {
      tDataInfo: '',
      tDptInfo: '',
      dataFile: null,
      dptFile: null,
      startLoading: false,
      exportReady: false,
      logs: [],
      progressPercent: 0,
      progressStatus: 'active'
    }
  },
  computed: {
    startReady () {
      return this.dataFile && this.dptFile;
    },
  },
  mounted () {
    this.pushLog('🚀 程序启动，如果是首次使用，请先阅读【说明】');
    this.pushLog('⚡ 请在使用前先删除 data 表中的 format_content 和 content 字段，避免内存不足导致程序崩溃', true);
  },
  updated () {
    this.$refs.logs.scrollTop = this.$refs.logs.scrollHeight - 160;
  },
  methods: {
    async sleep (ms) {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve();
        }, ms);
      });
    },
    makeDouble: function (t) {
      return t < 10 ? `0${t}` : t;
    },
    pushLog (text, isErr = false) {
      const ct = new Date().toLocaleTimeString('zh-CN', {hour12: false});
      const formatText = `[ ${ct} ] ~ ${text}`;
      this.logs.push({text: formatText, isErr: isErr})
    },
    onDataFileChange (e) {
      this.tDataInfo = this.assembleFileInfo(e.file.name, e.file.size);
      if (!/^t_data/.test(e.file.name)) {
        this.pushLog('data 表必须以 t_data 开头', true);
      } else if (e.file.size > 250000000) {
        this.pushLog('data 表不能大于 250 MB，请适当删减或拆分', true);
      } else {
        this.dataFile = e.file;
      }
    },
    onDptFileChange (e) {
      this.tDptInfo = this.assembleFileInfo(e.file.name, e.file.size);
      if (!/^t_dpt/.test(e.file.name)) {
        this.pushLog('dpt 表必须以 t_dpt 开头', true);
      } else {
        this.dptFile = e.file;
      }
    },
    assembleFileInfo (name, size) {
      if (size > 1000000) {
        return `${name}（${(size / 1000000).toFixed(1)} MB）`;
      } else {
        return `${name}（${(size / 1000).toFixed(1)} KB）`;
      }
    },
    async onStart () {
      // 重置数据库
      try {
        await this.$db.data.clear();
        await this.$db.dpt.clear();
      } catch (err) {
        this.handleError(err, '重置数据库失败');
      }

      // 重置状态
      this.logs = [];
      this.progressPercent = 0;
      this.progressStatus = 'active';
      this.pushLog('⌛️ 开始读取数据表，请耐心等待...')
      this.startLoading = true;
      this.readAndStoreDataTable();
    },
    readAndStoreDataTable () {
      this.pushLog('读取 data 表...');
      const dataReader = new FileReader();

      dataReader.onload = async function (e) {
        const dataSheet = this.readTable(e.target.result);
        this.progressPercent = 20;
        const dataSource = this.parseSheet(dataSheet, 'data');
        const dataTarget = this.deduplicateSheet(dataSource);
        try {
          await this.$db.data.bulkAdd(dataTarget);
        } catch (err) {
          this.handleError(err, '写入 data 表数据库失败');
        }
        this.readAndStoreDptTable();
      }.bind(this);

      dataReader.onerror = function (err) {
        this.handleError(err, '读取 data 表失败');
      }.bind(this);

      dataReader.readAsArrayBuffer(this.dataFile);
    },
    readAndStoreDptTable () {
      this.pushLog('读取 dpt 表...');
      const dptReader = new FileReader();

      dptReader.onload = async function (e) {
        const dptSheet = this.readTable(e.target.result);
        this.progressPercent = 30;
        const dptSource = this.parseSheet(dptSheet, 'dpt');
        const dptTarget = this.deduplicateSheet(dptSource);
        try {
          await this.$db.dpt.bulkAdd(dptTarget);
          this.pushLog('开始二次处理...');
          this.mutateSheet();
        } catch (err) {
          this.handleError(err, '写入 dpt 表数据失败');
        }
      }.bind(this);

      dptReader.onerror = function (err) {
        this.handleError(err, '读取 dpt 表失败');
      }.bind(this);

      dptReader.readAsArrayBuffer(this.dptFile);
    },
    readTable (table) {
      const data = new Uint8Array(table);
      const sheet = XLSX.read(data, {type: 'array'}).Sheets.sheet;
      return sheet;
    },
    parseSheet (sheet, sheetType) {
      const matches = /[A-Z]+\d+:([A-Z]+)(\d+)/.exec(sheet['!ref']);
      const lastCol = matches[1];
      const rowCount = parseInt(matches[2]);
      const cols = this.genCols(lastCol);
      const fields = this.genFields(cols, sheet);
      const rows = this.genRows(sheetType, rowCount, fields, sheet);
      return rows;
    },
    async mutateSheet () {
      let datas = null;
      let dpts = null;
      try {
        datas = await this.$db.data.toArray();
        dpts = await this.$db.dpt.toArray();
      } catch (err) {
        this.handleError(err, '读取数据库 data/ dpt 表失败');
      }

      // 根据 url_crc 匹配 data 表和 dpt 表
      for (let i = 0; i < datas.length; i++) {
        const data = datas[i];
        let flag = false;

        for (let j = 0; j < dpts.length; j++) {
          const dpt = dpts[j];
          if (data.url_crc == dpt.url_crc) {
            flag = true;
            data.attitudes_count = dpt.attitudes_count;
            data.click_count = dpt.click_count;
            data.comments_count = dpt.comments_count;
            data.quote_count = dpt.quote_count;
            break;
          }
        }

        if (!flag) {
          data.attitudes_count = 0;
          data.click_count = 0;
          data.comments_count = 0;
          data.quote_count = 0;
        }
      }
      this.pushLog('data 表、dpt 表匹配成功');
      this.progressPercent = 35;

      // 提取域名
      const newDatas = datas.map(data => {
        const result = parse(data.url);
        if (result.isIcann) {
          data.domain = result.domain;
          data.subdomain = result.subdomain;
          data.hostname =  result.hostname;
        }
        return data;
      });
      this.pushLog('data 表提取域名成功，开始计算曝光量...');
      this.progressPercent = 45;

      try {
        await this.$db.data.bulkPut(newDatas);
        this.calcWeibo();
      } catch (err) {
        this.handleError(err, '更新数据库 data 表失败');
      }
    },
    // 根据 url_crc 去重
    deduplicateSheet (sheet) {
      const unique = sheet.reduce((acc, cur) => {
        let flag = true;
        for (let i = 0; i < acc.length; i++) {
          if (acc[i].url_crc == cur.url_crc) {
            flag = false;
            break;
          }
        }
        if (flag) {
          acc.push(cur);
        }
        return acc;
      }, []);
      return unique;
    },
    // 根据最后一列序号生成所有列序号
    genCols (lastCol) {
      const cols = [];
      let flag = true;

      while (flag) {
        if (cols.length < 26) {
          const col = baseCols[cols.length];
          cols.push(col);
          if (col == lastCol) {
            flag = false;
          }
        } else {
          const tmpCols = cols.slice(-26);
          for (let i = 0; i < tmpCols.length; i++) {
            const tmpCol = tmpCols[i];
            for (let j = 0; j < baseCols.length; j++) {
              const baseCol = baseCols[j];
              const col = tmpCol + baseCol;
              cols.push(col);
              if (col == lastCol) {
                flag = false;
                break;
              }
            }
            if (!flag) {
              break;
            }
          }
        }
      }
      return cols;
    },
    // 生成 { 字段名: 列序号 } 映射，用于 data 表和 dpt 表的匹配
    genFields (cols, sheet) {
      const fields = {};
      for (let i = 0; i < cols.length; i++) {
        const col = cols[i];
        const key = col + '1';
        fields[sheet[key].v] = col;
      }
      return fields;
    },
    // 将每行数据整理为一个对象，全表以数组形式返回
    genRows (type, rowCount, fields, sheet) {
      const rows = [];
      // data 表提取字段
      if (type == 'data') {
        const url_crc_key = fields['url_crc'];
        const url_key = fields['url'];
        const source_type_key = fields['source_type'];
        const author_key = fields['author'];
        const media_name_key = fields['media_name'];
        const original_media_name_key = fields['original_media_name'];
        const content_media_name_key = fields['content_media_name'];
        const source_tags_key = fields['source_tags'];

        for (let i = 2; i <= rowCount; i++) {
          const row = {};
          row.url_crc = sheet[url_crc_key + i.toString()] ? sheet[url_crc_key + i.toString()].v : '';
          row.url = sheet[url_key + i.toString()] ? sheet[url_key + i.toString()].v : '';
          row.source_type = sheet[source_type_key + i.toString()] ? sheet[source_type_key + i.toString()].v : '';
          row.author = sheet[author_key + i.toString()] ? sheet[author_key + i.toString()].v : '';
          row.media_name = sheet[media_name_key + i.toString()] ? sheet[media_name_key + i.toString()].v : '';
          row.original_media_name = sheet[original_media_name_key + i.toString()] ? sheet[original_media_name_key + i.toString()].v : '';
          row.content_media_name = sheet[content_media_name_key + i.toString()] ? sheet[content_media_name_key + i.toString()].v : '';
          row.source_tags = sheet[source_tags_key + i.toString()] ? sheet[source_tags_key + i.toString()].v : '';

          // 校正 app 类型
          if (row.source_type == '0' && row.source_tags == 'app') {
            row.source_type = '12';
          }
          row.impress = 0;
          rows.push(row);
        }
      // dpt 表提取字段
      } else {
        const url_crc_key = fields['url_crc'];
        const attitudes_count_key = fields['attitudes_count'];
        const click_count_key = fields['click_count'];
        const comments_count_key = fields['comments_count'];
        const quote_count_key = fields['quote_count'];

        for (let i = 2; i <= rowCount; i++) {
          const row = {};
          row.url_crc = sheet[url_crc_key + i.toString()].v;
          row.attitudes_count = sheet[attitudes_count_key + i.toString()] ? parseInt(sheet[attitudes_count_key + i.toString()].v) : 0;
          row.click_count = sheet[click_count_key + i.toString()] ? parseInt(sheet[click_count_key + i.toString()].v) : 0;
          row.comments_count = sheet[comments_count_key + i.toString()] ? parseInt(sheet[comments_count_key + i.toString()].v) : 0;
          row.quote_count = sheet[quote_count_key + i.toString()] ? parseInt(sheet[quote_count_key + i.toString()].v) : 0;
          rows.push(row);
        }
      }
      return rows;
    },
    // 计算微博曝光量
    async calcWeibo () {
      const rows = await this.$db.data.where({source_type: '4'}).toArray();
      this.pushLog(`计算 source_type = 4 的记录，共 ${rows.length} 条`);
      rows.forEach(row => {
        row.impress = Math.round(Math.max(94, row.quote_count, row.comments_count * 90, row.attitudes_count / 0.00014 / 37.86));
      });

      try {
        this.$db.data.bulkPut(rows);
        this.progressPercent = 55;
        this.calcClick();
      } catch (err) {
        this.handleError(err, '更新 source_type = 4 记录失败');
      }
    },
    // 计算阅读数不为 0 记录的曝光量
    async calcClick () {
      const rows = await this.$db.data.where('click_count').above(0).toArray();
      this.pushLog(`计算 click_count ≠ 0 的记录，共 ${rows.length} 条`);
      rows.forEach(row => {
        row.impress = Math.max(row.click_count, 10);
      });

      try {
        this.$db.data.bulkPut(rows);
        this.progressPercent = 65;
        this.calcComment();
      } catch (err) {
        this.handleError(err, '更新 click_count ≠ 0 记录失败');
      }
    },
    // 计算评论数不为 0 记录的曝光量
    async calcComment () {
      const tmpRows = await this.$db.data.where('comments_count').above(0).toArray();
      const rows = tmpRows.filter(i => i.impress === 0);
      this.pushLog(`计算 comments_count ≠ 0 的记录，共 ${rows.length} 条`);
      rows.forEach(row => {
        row.impress = row.comments_count * 303;
      });

      try {
        this.$db.data.bulkPut(rows);
        this.progressPercent = 75;
        this.calcNotApp();
      } catch (err) {
        this.handleError(err, '更新 comments_count ≠ 0 记录失败');
      }
    },
    async calcNotApp () {
      const tmpRows = await this.$db.data.where('click_count').equals(0).sortBy('domain');
      const rows = tmpRows.filter(i => i.source_type != '4' && i.source_type != '12');
      this.pushLog(`计算 source_type = 0/1/2/3/5/6 的记录，共 ${rows.length} 条`);

      let currentDomain = null;
      let currentDetails = null;
      let nullCount = 0;
      let continueFlag = true;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        this.progressPercent = 75 + Math.ceil((i / rows.length) * 15);

        // current 保存临时主域名信息，减少请求次数，为空或不匹配时更新
        if (currentDomain == null || row.domain != currentDomain) {
          currentDomain = row.domain;
          currentDetails = await this.getDomain(row.domain);
          await this.sleep(250);

          // 获取主域名请求失败，中断计算，不执行后续操作 
          if (currentDetails == -1) {
            this.pushLog(`💀 ${currentDomain}`, true);
            continueFlag = false;
            break;

          // 请求的主域名无记录，跳过
          } else if (currentDetails == null) {
            this.pushLog(`× ${currentDomain}`, true);
            nullCount += 1;
            continue;
            
          } else {
            this.pushLog(`√ ${currentDomain}`);
          }
        } else if (currentDomain == row.domain && currentDetails == null) {
          continue;
        }

        currentDetails.minImpress = currentDetails.subs.sort((a, b) => a.impress - b.impress)[0].impress;

        for (let j = 0; j < currentDetails.subs.length; j++) {
          const sub = currentDetails.subs[j];
          if (sub.subdomain == currentDomain) {
            if (['', 'www'].includes(row.subdomain)) {
              row.impress = sub.impress;
              break;
            }
          } else if (sub.subdomain == row.subdomain) {
            row.impress = sub.impress;
            break;
          }
        }

        // 匹配不到子域名时，赋予子域名中最小的曝光量
        if (row.impress == 0) {
          row.impress = currentDetails.minImpress;
        }
      }

      if (continueFlag) {
        try {
          this.$db.data.bulkPut(rows);
          this.progressPercent = 90;
          this.pushLog(`以上打 × 的 ${nullCount} 个主域名在数据库中无有效记录，请根据实际情况添加或更新到数据库，详见【说明】`)
          this.calcApp();
        } catch (err) {
          this.handleError(err, '更新 source_type = 0/1/2/3/5/6 记录失败');
        }
      } else {
        this.startLoading = false;
        this.pushLog('出现异常，计算中断', true);
      }
    },
    async calcApp () {
      const tmpRows = await this.$db.data.where('source_type').equals('12').toArray();
      const rows = tmpRows.filter(row => row.impress === 0 && row.click_count === 0);
      this.pushLog(`计算 source_type = 12 的记录，共 ${rows.length} 条`);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        row.impress = row.domain == 'toutiao.com' ? 150 : 40;
      }

      try {
        this.$db.data.bulkPut(rows);
        this.progressPercent = 95;
        this.assignImpress();
      } catch (err) {
        this.handleError(err, '更新 source_type = 12 记录失败');
      }
    },
    async assignImpress () {
      const tmpRows = await this.$db.data.where('impress').below(10).toArray();
      const rows = tmpRows.filter(row => !['4', '12'].includes(row.source_type));
      this.pushLog(`赋值 source_type ≠ 4 或 12 ，且曝光量 < 10 的记录，共 ${rows.length} 条`);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        row.impress = 10;
      }

      try {
        this.$db.data.bulkPut(rows);
        this.progressPercent = 100;
        this.progressStatus = 'success';
        this.startLoading = false;
        this.exportReady = true;
        this.pushLog('🎉 计算结束，请点击【导出】下载计算结果，进行后续处理');

      } catch (err) {
        this.handleError(err, '赋值 source_type ≠ 4 或 12 ，且曝光量 < 10 记录失败');
      }
    },
    async getDomain (domain) {
      const url = `https://nr-impress.herokuapp.com/domain/${domain}`;
      try {
        const result = await this.$ax(url);
        const resultData = result.data;
        if (resultData) {
          return resultData.data;
        } else {
          window.console.log(domain, resultData.msg);
          return null;
        }
      } catch (err) {
        this.handleError(err, '获取主域名请求失败');
        return -1;
      }
    },
    // 统一错误处理
    handleError (err, msg) {
      window.console.log(err);
      this.pushLog(msg, true);
      this.startLoading = false;
      this.progressStatus = 'exception';
    },
    async onExport () {
      try {
        const rows = await this.$db.data.toArray();
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows, {
          header: ['url_crc', 'url', 'hostname', 'subdomain', 'domain', 'source_type', 'source_tags', 'click_count', 'comments_count', 'attitudes_count', 'quote_count', 'impress', 'author', 'media_name', 'original_media_name', 'content_media_name']
        });
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        XLSX.writeFile(wb, `impress_${new Date().getTime()}.xlsx`);
      } catch (err) {
        this.pushLog('导出失败', true);
      }
    }
  }
}
</script>

<style scoped>
#logs {
  margin-top: 24px;
  height: 160px;
  border: 1px solid rgb(217, 217, 217);
  border-radius: 4px;
  text-align: left;
  padding: 8px 0; 
  overflow-y: scroll;
}
li {
  color: rgba(0, 0, 0, .55);
  padding: 0 16px;
}
button {
  width: 130px;
}
.error {
  color: #f5222d;
}
</style>