require('dotenv').config();
const sequelize = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function fixAdminPassword() {
  try {
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공');
    
    // 현재 admin 계정의 비밀번호 해시 확인
    const [adminResult] = await sequelize.query(
      'SELECT password_hash FROM users WHERE email = ?',
      { replacements: ['admin@example.com'] }
    );
    
    if (adminResult.length > 0) {
      console.log('📋 현재 admin 비밀번호 해시:', adminResult[0].password_hash);
      
      // "admin123"의 올바른 해시 생성
      const correctHash = await bcrypt.hash('admin123', 12);
      console.log('🔑 새로운 비밀번호 해시:', correctHash);
      
      // 비밀번호 해시 업데이트
      await sequelize.query(
        'UPDATE users SET password_hash = ? WHERE email = ?',
        { replacements: [correctHash, 'admin@example.com'] }
      );
      
      console.log('✅ admin 계정 비밀번호 해시 업데이트 완료');
      
      // 검증
      const isValid = await bcrypt.compare('admin123', correctHash);
      console.log('🔍 비밀번호 검증 테스트:', isValid);
      
    } else {
      console.log('❌ admin 계정을 찾을 수 없습니다.');
    }
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ 오류:', error);
    process.exit(1);
  }
}

fixAdminPassword();