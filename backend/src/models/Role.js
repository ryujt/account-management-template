const database = require('../config/database');

class Role {
  constructor(data = {}) {
    this.role_name = data.role_name;
    this.description = data.description;
    this.created_at = data.created_at;
  }

  async save() {
    try {
      const { rows } = await database.execute(
        `INSERT INTO roles (role_name, description)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE description = VALUES(description)`,
        [this.role_name, this.description]
      );

      return rows.affectedRows > 0;
    } catch (error) {
      console.error('Role save error:', error);
      throw error;
    }
  }

  static async findAll() {
    try {
      const { rows } = await database.execute(
        'SELECT * FROM roles ORDER BY role_name'
      );

      return rows.map(row => new Role(row));
    } catch (error) {
      console.error('Role findAll error:', error);
      throw error;
    }
  }

  static async findByName(roleName) {
    try {
      const { rows } = await database.execute(
        'SELECT * FROM roles WHERE role_name = ?',
        [roleName]
      );

      if (rows.length === 0) {
        return null;
      }

      return new Role(rows[0]);
    } catch (error) {
      console.error('Role findByName error:', error);
      throw error;
    }
  }

  static async create(roleName, description = null) {
    try {
      const role = new Role({
        role_name: roleName,
        description: description
      });

      await role.save();
      return role;
    } catch (error) {
      console.error('Role creation error:', error);
      throw error;
    }
  }

  static async delete(roleName) {
    try {
      // Check if role is assigned to any users
      const { rows: userRoles } = await database.execute(
        'SELECT COUNT(*) as count FROM user_roles WHERE role_name = ?',
        [roleName]
      );

      if (userRoles[0].count > 0) {
        throw new Error('Cannot delete role that is assigned to users');
      }

      const { rows } = await database.execute(
        'DELETE FROM roles WHERE role_name = ?',
        [roleName]
      );

      return rows.affectedRows > 0;
    } catch (error) {
      console.error('Role delete error:', error);
      throw error;
    }
  }

  async update(description) {
    try {
      this.description = description;

      const { rows } = await database.execute(
        'UPDATE roles SET description = ? WHERE role_name = ?',
        [this.description, this.role_name]
      );

      return rows.affectedRows > 0;
    } catch (error) {
      console.error('Role update error:', error);
      throw error;
    }
  }

  // Get users with this role
  async getUsers() {
    try {
      const { rows } = await database.execute(
        `SELECT u.*, ur.assigned_by, ur.created_at as role_assigned_at
         FROM users u
         JOIN user_roles ur ON u.user_id = ur.user_id
         WHERE ur.role_name = ?
         ORDER BY u.display_name`,
        [this.role_name]
      );

      return rows;
    } catch (error) {
      console.error('Role getUsers error:', error);
      throw error;
    }
  }

  // Get role statistics
  static async getStats() {
    try {
      const { rows } = await database.execute(`
        SELECT 
          r.role_name,
          r.description,
          COUNT(ur.user_id) as user_count,
          r.created_at
        FROM roles r
        LEFT JOIN user_roles ur ON r.role_name = ur.role_name
        GROUP BY r.role_name, r.description, r.created_at
        ORDER BY user_count DESC, r.role_name
      `);

      return rows;
    } catch (error) {
      console.error('Role getStats error:', error);
      throw error;
    }
  }

  // Check if role exists
  static async exists(roleName) {
    try {
      const { rows } = await database.execute(
        'SELECT 1 FROM roles WHERE role_name = ?',
        [roleName]
      );

      return rows.length > 0;
    } catch (error) {
      console.error('Role exists error:', error);
      return false;
    }
  }

  // Get role usage count
  async getUserCount() {
    try {
      const { rows } = await database.execute(
        'SELECT COUNT(*) as count FROM user_roles WHERE role_name = ?',
        [this.role_name]
      );

      return rows[0].count;
    } catch (error) {
      console.error('Role getUserCount error:', error);
      throw error;
    }
  }

  // Initialize default roles
  static async initializeDefaults() {
    try {
      const defaultRoles = [
        {
          role_name: 'member',
          description: 'Regular user with basic permissions'
        },
        {
          role_name: 'admin',
          description: 'Administrator with full permissions'
        }
      ];

      for (const roleData of defaultRoles) {
        const existingRole = await Role.findByName(roleData.role_name);
        if (!existingRole) {
          await Role.create(roleData.role_name, roleData.description);
          console.log(`Created default role: ${roleData.role_name}`);
        }
      }
    } catch (error) {
      console.error('Role initializeDefaults error:', error);
      throw error;
    }
  }

  // Role hierarchy and permissions (can be extended)
  static getRoleHierarchy() {
    return {
      'admin': {
        level: 100,
        permissions: ['*'], // All permissions
        inherits: []
      },
      'member': {
        level: 1,
        permissions: ['user.read', 'user.update'],
        inherits: []
      }
    };
  }

  static hasPermission(userRoles, requiredPermission) {
    const hierarchy = Role.getRoleHierarchy();
    
    for (const roleName of userRoles) {
      const role = hierarchy[roleName];
      if (role && (role.permissions.includes('*') || role.permissions.includes(requiredPermission))) {
        return true;
      }
    }
    
    return false;
  }

  toJSON() {
    return {
      role_name: this.role_name,
      description: this.description,
      created_at: this.created_at
    };
  }
}

module.exports = Role;