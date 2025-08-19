const bcrypt = require('bcryptjs');

async function generateHash() {
  try {
    const hash = await bcrypt.hash('admin123', 12);
    console.log('Correct hash for admin123:', hash);
    
    // 현재 잘못된 해시와 비교 테스트
    const wrongHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewfC6JRs.kF5.Cu.';
    const testWrong = await bcrypt.compare('admin123', wrongHash);
    console.log('Wrong hash test:', testWrong);
    
    const testCorrect = await bcrypt.compare('admin123', hash);
    console.log('Correct hash test:', testCorrect);
  } catch (error) {
    console.error('Error:', error);
  }
}

generateHash();