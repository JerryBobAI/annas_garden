-- ============================================
-- Anna's Garden - 种子数据
-- 一年级下学期基础数据
-- ============================================

-- 1. 学期数据
INSERT INTO semesters (id, name, start_date, end_date, grade) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '一年级下学期', '2026-02-16', '2026-07-03', '一年级')
ON CONFLICT (id) DO NOTHING;

-- 2. 学习目标（按周分解）
-- 语文
INSERT INTO learning_goals (semester_id, subject, week_number, title, description, priority, mastery_threshold) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'chinese', 1, '春天来了（课文朗读）', '流利朗读课文，理解春天特征', 'core', 80),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'chinese', 2, '识字：春、花、草、树', '认识并会写 20 个生字', 'core', 90),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'chinese', 3, '春夏秋冬（季节认知）', '了解四季变化，积累词汇', 'important', 75),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'chinese', 4, '小青蛙（儿歌学习）', '朗读儿歌，认识相关生字', 'normal', 70),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'chinese', 5, '猜字谜（趣味识字）', '通过字谜加深对汉字结构的理解', 'important', 75),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'chinese', 6, '看图写话入门', '能用完整句子描述图片内容', 'core', 70),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'chinese', 7, '小公鸡和小鸭子（寓言）', '理解故事寓意，朗读表演', 'normal', 75),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'chinese', 8, '树和喜鹊（友情主题）', '体会友情的重要性，朗读感悟', 'important', 75),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'chinese', 9, '怎么都快乐（快乐主题）', '感受快乐的多样性，朗读表达', 'normal', 70),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'chinese', 10, '静夜思（古诗背诵）', '背诵古诗，理解思乡之情', 'core', 90),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'chinese', 11, '夜色（克服恐惧）', '理解诗意，培养勇气', 'normal', 70),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'chinese', 12, '端午粽（传统文化）', '了解端午习俗，识字写字', 'important', 75),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'chinese', 13, '彩虹（想象写作）', '培养想象力，尝试创意表达', 'normal', 70),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'chinese', 14, '识字加油站（总复习）', '复习巩固本学期生字', 'core', 90),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'chinese', 15, '期末复习', '全面复习，查缺补漏', 'core', 85)
ON CONFLICT DO NOTHING;

-- 数学
INSERT INTO learning_goals (semester_id, subject, week_number, title, description, priority, mastery_threshold) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'math', 1, '20以内退位减法（一）', '掌握十几减9、减8的计算方法', 'core', 90),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'math', 2, '20以内退位减法（二）', '掌握十几减7~2的计算方法', 'core', 90),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'math', 3, '20以内退位减法综合练习', '熟练口算20以内退位减法', 'core', 95),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'math', 4, '认识图形（二）', '认识长方形、正方形、三角形、圆', 'core', 85),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'math', 5, '图形拼组', '用基本图形拼出组合图形', 'important', 75),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'math', 6, '分类与整理', '学会按不同标准分类', 'important', 80),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'math', 7, '100以内数的认识（一）', '认识计数单位，会数100以内的数', 'core', 90),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'math', 8, '100以内数的认识（二）', '掌握数的组成和大小比较', 'core', 90),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'math', 9, '认识人民币', '认识元、角、分及简单换算', 'important', 80),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'math', 10, '100以内加法和减法（一）', '掌握整十数加减、两位数加一位数', 'core', 85),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'math', 11, '100以内加法和减法（二）', '掌握两位数减一位数', 'core', 85),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'math', 12, '解决问题', '用数学方法解决简单实际问题', 'core', 80),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'math', 13, '找规律', '发现简单规律并应用', 'normal', 70),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'math', 14, '口算速算训练', '提高口算速度和准确率', 'core', 90),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'math', 15, '期末复习', '全面复习，查缺补漏', 'core', 85)
ON CONFLICT DO NOTHING;

-- 英语
INSERT INTO learning_goals (semester_id, subject, week_number, title, description, priority, mastery_threshold) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'english', 1, 'Phonics Unit 1 - Short A', '掌握短元音a的发音规律', 'core', 80),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'english', 2, '英文歌谣 - Hello Song', '会唱Hello Song，能跟读节奏', 'important', 75),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'english', 3, 'Phonics Unit 2 - Short E', '掌握短元音e的发音规律', 'core', 80),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'english', 4, '绘本阅读 - Brown Bear', '能听懂并跟读Brown Bear故事', 'important', 75),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'english', 5, 'Phonics Unit 3 - Short I', '掌握短元音i的发音规律', 'core', 80),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'english', 6, '英文歌谣 - The ABC Song', '熟练唱ABC Song，认识26个字母', 'important', 75),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'english', 7, 'Phonics Unit 4 - Short O', '掌握短元音o的发音规律', 'core', 80),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'english', 8, '课堂指令词汇', '听懂Stand up/Sit down等简单指令', 'normal', 70),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'english', 9, 'Phonics Unit 5 - Short U', '掌握短元音u的发音规律', 'core', 80),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'english', 10, '绘本阅读 - The Very Hungry Caterpillar', '能听懂并理解故事大意', 'important', 70),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'english', 11, 'Phonics Unit 6 - Review', '复习5个短元音，巩固拼读能力', 'core', 85),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'english', 12, '英文歌谣 - Old MacDonald', '会唱Old MacDonald，学习动物词汇', 'normal', 70),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'english', 13, '简单对话 - Greetings', '能用Hello/Hi/Good morning打招呼', 'important', 75),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'english', 14, '复习与巩固', '复习本学期内容', 'core', 80),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'english', 15, '期末复习', '全面复习，查缺补漏', 'core', 85)
ON CONFLICT DO NOTHING;

-- 3. 示例学习资料
INSERT INTO materials (id, subject, grade, type, title, content, source, status) VALUES
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567891', 'math', '一年级', 'exercise', '20以内退位减法 - 第1课',
    '{"description": "十几减9的练习题", "knowledge_points": ["退位减法", "十几减9"]}',
    'manual', 'approved'),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567892', 'chinese', '一年级', 'exercise', '识字练习 - 春天的生字',
    '{"description": "春天相关生字认识与书写", "knowledge_points": ["识字", "春天"]}',
    'manual', 'approved'),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567893', 'english', '一年级', 'exercise', 'Phonics Unit 1 - Short A 练习',
    '{"description": "短元音a的认读和拼写练习", "knowledge_points": ["Phonics", "short a"]}',
    'manual', 'approved')
ON CONFLICT (id) DO NOTHING;

-- 4. 示例练习题（数学十几减9）
INSERT INTO exercises (material_id, question, options, correct_answer, difficulty, knowledge_points) VALUES
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567891', '{"type": "choice", "text": "12 - 9 = ?"}', '["2", "3", "4", "5"]', '3', 'easy', ARRAY['退位减法', '十几减9']),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567891', '{"type": "choice", "text": "15 - 9 = ?"}', '["5", "6", "7", "8"]', '6', 'easy', ARRAY['退位减法', '十几减9']),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567891', '{"type": "choice", "text": "11 - 9 = ?"}', '["1", "2", "3", "4"]', '2', 'easy', ARRAY['退位减法', '十几减9']),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567891', '{"type": "choice", "text": "14 - 9 = ?"}', '["4", "5", "6", "7"]', '5', 'easy', ARRAY['退位减法', '十几减9']),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567891', '{"type": "choice", "text": "17 - 9 = ?"}', '["6", "7", "8", "9"]', '8', 'medium', ARRAY['退位减法', '十几减9']),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567891', '{"type": "choice", "text": "18 - 9 = ?"}', '["7", "8", "9", "10"]', '9', 'easy', ARRAY['退位减法', '十几减9']),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567891', '{"type": "choice", "text": "13 - 9 = ?"}', '["3", "4", "5", "6"]', '4', 'easy', ARRAY['退位减法', '十几减9']),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567891', '{"type": "choice", "text": "16 - 9 = ?"}', '["5", "6", "7", "8"]', '7', 'medium', ARRAY['退位减法', '十几减9']),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567891', '{"type": "choice", "text": "19 - 9 = ?"}', '["8", "9", "10", "11"]', '10', 'easy', ARRAY['退位减法', '十几减9']),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567891', '{"type": "choice", "text": "小红有13朵花，送给小明9朵，还剩几朵？"}', '["3朵", "4朵", "5朵", "6朵"]', '4朵', 'medium', ARRAY['退位减法', '解决问题']);

-- 5. 示例练习题（语文识字）
INSERT INTO exercises (material_id, question, options, correct_answer, difficulty, knowledge_points) VALUES
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567892', '{"type": "choice", "text": "\"春\"字的部首是什么？"}', '["日", "一", "大", "三人"]', '日', 'medium', ARRAY['识字', '部首']),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567892', '{"type": "choice", "text": "下面哪个字是\"花\"的正确笔顺的第一笔？"}', '["横", "竖", "撇", "点"]', '横', 'hard', ARRAY['识字', '笔顺']),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567892', '{"type": "choice", "text": "\"草\"字一共有多少画？"}', '["8画", "9画", "10画", "11画"]', '9画', 'medium', ARRAY['识字', '笔画']),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567892', '{"type": "choice", "text": "\"树木\"的正确读音是？"}', '["shù mù", "sù mù", "shù mā", "zhù mù"]', 'shù mù', 'easy', ARRAY['识字', '拼音']),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567892', '{"type": "choice", "text": "哪个字的偏旁是\"草字头\"？"}', '["树", "花", "木", "林"]', '花', 'easy', ARRAY['识字', '部首']);

-- 6. 示例练习题（英语 Phonics）
INSERT INTO exercises (material_id, question, options, correct_answer, difficulty, knowledge_points) VALUES
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567893', '{"type": "choice", "text": "Which word has the short \"a\" sound?"}', '["cat", "see", "big", "go"]', 'cat', 'easy', ARRAY['Phonics', 'short a']),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567893', '{"type": "choice", "text": "Which word rhymes with \"bat\"?"}', '["hat", "bit", "but", "bet"]', 'hat', 'easy', ARRAY['Phonics', 'rhyming']),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567893', '{"type": "choice", "text": "What sound does \"a\" make in \"apple\"?"}', '["/æ/", "/eɪ/", "/ɑː/", "/ə/"]', '/æ/', 'medium', ARRAY['Phonics', 'short a']),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567893', '{"type": "choice", "text": "Which word starts with short \"a\"?"}', '["ant", "egg", "ink", "orange"]', 'ant', 'easy', ARRAY['Phonics', 'short a']),
  ('b1b2c3d4-e5f6-7890-abcd-ef1234567893', '{"type": "choice", "text": "Complete: c_t (cat)"}', '["a", "e", "i", "o"]', 'a', 'easy', ARRAY['Phonics', 'short a', 'spelling']);
