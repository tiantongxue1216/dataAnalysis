import sqlite3
import os
from datetime import datetime, timedelta

# 数据库文件路径
DB_FILE = 'smart_analyst.db'

def create_database():
    """创建数据库和表结构"""
    
    # 如果数据库文件已存在，先删除
    if os.path.exists(DB_FILE):
        os.remove(DB_FILE)
        print(f"已删除旧数据库文件: {DB_FILE}")
    
    # 连接到数据库（如果文件不存在会自动创建）
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    print("开始创建数据库表...")
    
    # 创建用户表
    cursor.execute('''
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    print("✓ 创建 users 表")
    
    # 创建订单表
    cursor.execute('''
    CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        total_amount REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        region TEXT NOT NULL DEFAULT 'unknown',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    ''')
    print("✓ 创建 orders 表")
    
    # 创建订单明细表
    cursor.execute('''
    CREATE TABLE order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        product_category TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price REAL NOT NULL,
        subtotal REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id)
    )
    ''')
    print("✓ 创建 order_items 表")
    
    # 创建产品类别表
    cursor.execute('''
    CREATE TABLE product_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    print("✓ 创建 product_categories 表")
    
    conn.commit()
    print("\n所有表创建完成！\n")
    
    return conn

def insert_sample_data(conn):
    """插入示例数据"""
    cursor = conn.cursor()
    
    print("开始插入示例数据...")
    
    # 插入产品类别
    categories = [
        ('电子产品', '包括手机、电脑等电子产品'),
        ('服装', '各类服装鞋帽'),
        ('食品', '食品和饮料'),
        ('家居用品', '家具和日用品'),
        ('图书', '各类图书和电子书籍'),
    ]
    
    cursor.executemany(
        'INSERT INTO product_categories (name, description) VALUES (?, ?)',
        categories
    )
    print(f"✓ 插入 {len(categories)} 条产品类别数据")
    
    # 插入用户数据
    users = []
    for i in range(1, 51):  # 创建50个用户
        username = f'user{i:03d}'
        email = f'{username}@example.com'
        users.append((username, email))
    
    cursor.executemany(
        'INSERT INTO users (username, email) VALUES (?, ?)',
        users
    )
    print(f"✓ 插入 {len(users)} 条用户数据")
    
    # 插入订单数据（最近12个月）
    orders = []
    regions = ['华东', '华南', '华北', '西南', '华中']
    statuses = ['completed', 'pending', 'shipped', 'cancelled']
    base_date = datetime.now() - timedelta(days=365)
    
    for i in range(1, 201):  # 创建200条订单
        order_number = f'ORD{base_date + timedelta(days=i//5):%Y%m%d}{i:04d}'
        user_id = (i % 50) + 1
        total_amount = round(100 + (i * 37.5) % 900, 2)
        status = statuses[i % 4]
        region = regions[i % 5]
        
        orders.append((order_number, user_id, total_amount, status, region))
    
    cursor.executemany(
        'INSERT INTO orders (order_number, user_id, total_amount, status, region) VALUES (?, ?, ?, ?, ?)',
        orders
    )
    print(f"✓ 插入 {len(orders)} 条订单数据")
    
    # 插入订单明细
    product_names = {
        '电子产品': ['iPhone 15', 'MacBook Pro', 'iPad Air', 'AirPods Pro', 'Apple Watch'],
        '服装': ['T恤', '牛仔裤', '运动鞋', '羽绒服', '连衣裙'],
        '食品': ['坚果礼盒', '进口巧克力', '有机牛奶', '绿茶', '咖啡豆'],
        '家居用品': ['台灯', '抱枕', '收纳盒', '香薰机', '地毯'],
        '图书': ['Python编程', '数据结构', '算法导论', '设计模式', '机器学习'],
    }
    
    order_items = []
    item_id = 1
    
    for order_idx, order in enumerate(orders):
        order_id = order_idx + 1
        category = list(product_names.keys())[order_idx % 5]
        product_name = product_names[category][order_idx % 5]
        quantity = (order_idx % 5) + 1
        unit_price = round(50 + (order_idx * 23.7) % 450, 2)
        subtotal = round(quantity * unit_price, 2)
        
        order_items.append((order_id, product_name, category, quantity, unit_price, subtotal))
        item_id += 1
    
    cursor.executemany(
        'INSERT INTO order_items (order_id, product_name, product_category, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
        order_items
    )
    print(f"✓ 插入 {len(order_items)} 条订单明细数据")
    
    conn.commit()
    print("\n所有示例数据插入完成！\n")

def verify_data(conn):
    """验证数据"""
    cursor = conn.cursor()
    
    print("=" * 50)
    print("数据库数据统计")
    print("=" * 50)
    
    # 统计各表数据量
    tables = ['users', 'orders', 'order_items', 'product_categories']
    for table in tables:
        cursor.execute(f'SELECT COUNT(*) FROM {table}')
        count = cursor.fetchone()[0]
        print(f"{table}: {count} 条记录")
    
    print("\n" + "=" * 50)
    print("示例查询")
    print("=" * 50)
    
    # 示例：最近订单
    cursor.execute('''
    SELECT order_number, total_amount, status, region 
    FROM orders 
    ORDER BY created_at DESC 
    LIMIT 5
    ''')
    print("\n最近5条订单:")
    for row in cursor.fetchall():
        print(f"  {row[0]} - ¥{row[1]:.2f} - {row[2]} - {row[3]}")
    
    # 示例：各区域订单统计
    cursor.execute('''
    SELECT region, COUNT(*) as order_count, SUM(total_amount) as total_sales
    FROM orders
    GROUP BY region
    ORDER BY total_sales DESC
    ''')
    print("\n各区域订单统计:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]} 笔订单，总计 ¥{row[2]:.2f}")
    
    # 示例：各产品类别销售统计
    cursor.execute('''
    SELECT product_category, SUM(quantity) as total_sold, SUM(subtotal) as total_revenue
    FROM order_items
    GROUP BY product_category
    ORDER BY total_revenue DESC
    ''')
    print("\n各产品类别销售统计:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: 销售 {row[1]} 件，收入 ¥{row[2]:.2f}")
    
    print("\n" + "=" * 50)

def main():
    print("智能分析系统 - SQLite 数据库初始化\n")
    print("=" * 50)
    
    # 创建数据库
    conn = create_database()
    
    # 插入示例数据
    insert_sample_data(conn)
    
    # 验证数据
    verify_data(conn)
    
    # 关闭连接
    conn.close()
    
    print("\n✓ 数据库初始化完成！")
    print(f"✓ 数据库文件位置: {os.path.abspath(DB_FILE)}")
    print("\n配置信息:")
    print("  数据库类型: SQLite")
    print(f"  数据库文件: {os.path.abspath(DB_FILE)}")
    print("  用户名: (无需)")
    print("  密码: (无需)")
    print("\n在前端配置时:")
    print("  - 数据库类型选择: SQLite")
    print("  - Host 填写: 本地文件路径")
    print("  - 用户名和密码留空")
    print("=" * 50)

if __name__ == '__main__':
    main()
