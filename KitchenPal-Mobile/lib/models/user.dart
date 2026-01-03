class User {
  final int userId;
  final String name;
  final String email;
  final String role;
  final int? branchId;

  User({
    required this.userId,
    required this.name,
    required this.email,
    required this.role,
    this.branchId,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      userId: json['user_id'] as int,
      name: json['name'] as String,
      email: json['email'] as String,
      role: json['role'] as String,
      branchId: json['branch_id'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'name': name,
      'email': email,
      'role': role,
      'branch_id': branchId,
    };
  }
}
