import { roundMedal } from '../shared/layout.js';

/** 标准圆章，上弧写 CLAUDE CODE。版式、自动留白和沿外形的描边见 shared/layout.js 的 roundMedal。 */
export const medal = (o) => roundMedal({ brandText: 'CLAUDE CODE', ...o });
