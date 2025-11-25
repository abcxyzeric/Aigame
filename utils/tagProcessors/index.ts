// utils/tagProcessors/index.ts

// File này đóng vai trò là điểm xuất trung tâm cho toàn bộ module xử lý thẻ.
// Giúp cho việc import ở các file khác trở nên gọn gàng hơn,
// ví dụ: import { dispatchTags, parseResponse } from './utils/tagProcessors';

export * from './types';
export * from './TagParser';
export * from './TagDispatcher';
export * from './ItemProcessor';
export * from './StatsProcessor';
export * from './TimeProcessor';
export * from './CompanionProcessor';
export * from './EntityProcessor';
export * from './InitProcessor';
export * from './MemoryProcessor';
export * from './MilestoneProcessor';
export * from './NpcProcessor';
export * from './QuestProcessor';
export * from './ReputationProcessor';
export * from './SkillProcessor';
export * from './StatusProcessor';
