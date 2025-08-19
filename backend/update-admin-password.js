require('dotenv').config();
const db = require('./src/adapters/database');

async function updateAdminPassword() {
  try {
    await db.connect();
    console.log('✅ 데이터베이스 연결 성공');
    
    // admin 사용자 찾기
    const admin = await db.getUserByEmail('admin@example.com');
    if (!admin) {
      console.log('❌ admin 사용자를 찾을 수 없습니다.');
      return;
    }
    
    console.log('👤 admin 사용자 발견:', admin.user_id);
    
    // 비밀번호를 "admin123"로 업데이트 (모델 훅이 자동으로 해시화 함)
    await db.updateUser(admin.user_id, {
      password_hash: 'admin123'
    });
    
    console.log('✅ admin 비밀번호 업데이트 완료');
    
    // 업데이트된 사용자 다시 조회하여 검증
    const updatedAdmin = await db.getUserByEmail('admin@example.com');
    const isValid = await updatedAdmin.comparePassword('admin123');
    console.log('🔍 비밀번호 검증:', isValid);
    
    await db.disconnect();
  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

updateAdminPassword();