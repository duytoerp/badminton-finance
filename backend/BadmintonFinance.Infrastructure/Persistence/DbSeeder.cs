using BadmintonFinance.Domain.Entities;
using BadmintonFinance.Domain.Enums;

namespace BadmintonFinance.Infrastructure.Persistence;

public static class DbSeeder
{
    public static void Seed(AppDbContext db)
    {
        if (!db.Roles.Any())
        {
            db.Roles.AddRange(
                new Role { Name = "Admin", Description = "Quản trị" },
                new Role { Name = "Treasurer", Description = "Thủ quỹ" },
                new Role { Name = "User", Description = "Người chơi" });
            db.SaveChanges();
        }
        if (!db.Users.Any())
        {
            var admin = new User
            {
                UserName = "admin",
                Email = "admin@local",
                FullName = "Administrator",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123")
            };
            db.Users.Add(admin);
            db.SaveChanges();
            var adminRole = db.Roles.First(r => r.Name == "Admin");
            db.UserRoles.Add(new UserRole { UserId = admin.Id, RoleId = adminRole.Id });
            db.SaveChanges();
        }
        if (!db.Funds.Any())
        {
            db.Funds.Add(new BadmintonFund { Name = "Quỹ chung", IsActive = true });
            db.SaveChanges();
        }
        if (!db.PricingTemplates.Any())
        {
            // 1) WeightedSlot (default) — share by weighted slots
            var weighted = new PricingTemplate
            {
                Name = "Mặc định (chia theo tỷ lệ)",
                Description = "Nữ ×0.7, người mới ×0.8, còn lại ×1.0. Tổng thu = tổng chi.",
                Mode = PricingMode.WeightedSlot,
                IsDefault = true, IsActive = true
            };
            db.PricingTemplates.Add(weighted);

            // 2) EqualPerHead — split equally by headcount
            var equal = new PricingTemplate
            {
                Name = "Chia đều theo số người",
                Description = "Tổng chi / số người. Bỏ qua giới tính, trình độ, số suất.",
                Mode = PricingMode.EqualPerHead,
                IsDefault = false, IsActive = true
            };
            db.PricingTemplates.Add(equal);

            // 3) FixedAmount — each gender/skill pays a fixed amount per slot
            var fixedTpl = new PricingTemplate
            {
                Name = "Thu tiền cố định",
                Description = "Nam 100k/slot, Nữ 70k/slot, người mới 50k/slot. Chênh lệch so với chi do quỹ chịu.",
                Mode = PricingMode.FixedAmount,
                IsDefault = false, IsActive = true
            };
            db.PricingTemplates.Add(fixedTpl);

            db.SaveChanges();

            db.PricingTemplateRules.AddRange(
                // weighted rules
                new PricingTemplateRule { PricingTemplateId = weighted.Id, Gender = Gender.Female, Multiplier = 0.7m },
                new PricingTemplateRule { PricingTemplateId = weighted.Id, SkillLevel = SkillLevel.Beginner, Multiplier = 0.8m },
                // fixed-amount rules
                new PricingTemplateRule { PricingTemplateId = fixedTpl.Id, Gender = Gender.Male, Multiplier = 1.0m, FixedAmount = 100_000m },
                new PricingTemplateRule { PricingTemplateId = fixedTpl.Id, Gender = Gender.Female, Multiplier = 1.0m, FixedAmount = 70_000m },
                new PricingTemplateRule { PricingTemplateId = fixedTpl.Id, SkillLevel = SkillLevel.Beginner, Multiplier = 1.0m, FixedAmount = 50_000m }
            );
            db.SaveChanges();
        }

        if (!db.ExpenseTemplates.Any())
        {
            var def = new ExpenseTemplate
            {
                Name = "Mặc định",
                Description = "Tiền sân tính theo giá giờ × số giờ × số sân.",
                IsDefault = true, IsActive = true
            };
            def.Items.Add(new ExpenseTemplateItem
            {
                Name = "Tiền sân",
                CalculationType = ExpenseCalculationType.CourtHourlyRate,
                Amount = 0, SortOrder = 0
            });
            def.Items.Add(new ExpenseTemplateItem
            {
                Name = "Tiền cầu (dự kiến)",
                CalculationType = ExpenseCalculationType.FixedAmount,
                Amount = 0, SortOrder = 1
            });
            db.ExpenseTemplates.Add(def);
            db.SaveChanges();
        }
    }
}
