require('dotenv').config();
const sequelize = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function checkUsers() {
  try {
    await sequelize.authenticate();
    console.log('✅ 데이터베이스 연결 성공');
    
    // Raw query로 사용자 확인
    const [users] = await sequelize.query(
      'SELECT user_id, email, first_name, last_name, roles, status, email_verified FROM users'
    );
    
    console.log('📋 데이터베이스에 있는 사용자들:');
    console.log(users);
    
    // 관리자 계정 확인
    const [adminResult] = await sequelize.query(
      'SELECT * FROM users WHERE email = ?',
      { replacements: ['admin@example.com'] }
    );
    
    if (adminResult.length > 0) {
      const admin = adminResult[0];
      console.log('\n👤 관리자 계정 발견:');
      console.log('이메일:', admin.email);
      console.log('역할:', admin.roles);
      console.log('상태:', admin.status);
      console.log('이메일 검증됨:', admin.email_verified);
      
      // 비밀번호 테스트
      const isValidPassword = await bcrypt.compare('admin123', admin.password_hash);
      console.log('🔑 비밀번호 "admin123" 유효:', isValidPassword);
    } else {
      console.log('\n❌ 관리자 계정을 찾을 수 없습니다.');
    }
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ 오류:', error);
    process.exit(1);
  }
}

checkUsers();