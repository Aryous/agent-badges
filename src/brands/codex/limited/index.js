import programmersDay from './programmers-day.js';
import anniversary from './anniversary.js';
import modelCollector from './model-collector.js';
import compactor from './compactor.js';
import newYear from './new-year.js';
import springFestival from './spring-festival.js';
import toolBirthday from './tool-birthday.js';
import christmas from './christmas.js';

// 限定与彩蛋：节日纪念和隐藏成就。外形各不相同，说明写在每枚徽章的文件开头。

export default {
  id: 'limited',
  title: '限定与彩蛋',
  subtitle: '特别的日子，隐藏的惊喜',
  en: { title: 'Limited & Secret', subtitle: 'Special days, hidden surprises' },
  badges: [programmersDay, anniversary, modelCollector, compactor, newYear, springFestival, toolBirthday, christmas],
};
