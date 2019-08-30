import Vue from 'vue';
import App from './App.vue';
import Dexie from 'dexie';
import Axios from 'axios';
import './plugins/ant-design-vue.js';
import { Menu, Icon, Upload, Button, Progress, Input, message, Table, Spin} from 'ant-design-vue';

const db = new Dexie('impress');
db.version(1).stores({
  data: 'url_crc,domain,source_type,click_count,comments_count,impress',
  dpt: 'url_crc'
});

Vue.prototype.$db = db;
Vue.prototype.$message = message;
Vue.prototype.$ax = Axios;

Vue.config.productionTip = false;
Vue.use(Menu);
Vue.use(Icon);
Vue.use(Upload);
Vue.use(Button);
Vue.use(Progress);
Vue.use(Input);
Vue.use(Table);
Vue.use(Spin);

new Vue({
  render: h => h(App),
}).$mount('#app');
