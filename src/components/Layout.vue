<template>
  <div style="padding-top: 48px;">
    <div style="position: fixed; width: 100%; top: 0; background-color: #fff;">
      <a-menu
        v-model="current"
        mode="horizontal"
        @click="onClick"
      >
        <a-menu-item key="calc">
          <a-icon type="calculator" />计算
        </a-menu-item>
        <a-menu-item key="search">
          <a-icon type="search" />查询
        </a-menu-item>
        <a-menu-item key="upsert">
          <a-icon type="build" />添加/更新
        </a-menu-item>
        <a-menu-item key="about">
          <a-icon type="info-circle" />说明
        </a-menu-item>
      </a-menu>
    </div>
    <div style="margin-top: 32px" class="row-center">
      <div style="width: 800px">
        <keep-alive>
          <component v-bind:is="currentTab"></component>
        </keep-alive>
      </div>
    </div>
  </div>
</template>

<script>
import Calc from './Calc.vue';
import Search from './Search.vue';
import Upsert from './Upsert.vue';
import About from './About.vue';

export default {
  name: 'Layout',
  components: {
    Calc,
    Search,
    Upsert,
    About
  },
  data () {
    return {
      current: ['calc'],
      currentTab: 'Calc'
    }
  },
  methods: {
    onClick (e) {
      switch (e.key) {
        case 'calc':
          this.currentTab = 'Calc';
          break;
        case 'search':
          this.currentTab = 'Search';
          break;
        case 'upsert':
          this.currentTab = 'Upsert';
          break;
        case 'about':
          this.currentTab = 'About';
      }
    }
  }
}
</script>

<style scoped>
li {
  display: inline-block;
  margin: 0 16px;
}
</style>
