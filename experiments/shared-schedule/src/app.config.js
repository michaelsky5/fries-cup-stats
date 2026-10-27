export default {
  pages: ['pages/schedule/index'],
  subPackages: ['center','archive','match','directory','ranking','following','player','team','evidence','review','advance','account'].map(root=>({root,pages:['pages/index']})),
  window: {
    navigationBarTitleText: '薯条杯赛事助手',
    navigationBarBackgroundColor: '#eeede6',
    navigationBarTextStyle: 'black',
    backgroundColor: '#eeede6'
  }
}
