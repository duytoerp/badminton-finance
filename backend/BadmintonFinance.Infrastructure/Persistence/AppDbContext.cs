using BadmintonFinance.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BadmintonFinance.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<BadmintonPlayer> Players => Set<BadmintonPlayer>();
    public DbSet<BadmintonCourt> Courts => Set<BadmintonCourt>();
    public DbSet<BadmintonSession> Sessions => Set<BadmintonSession>();
    public DbSet<BadmintonSessionParticipant> SessionParticipants => Set<BadmintonSessionParticipant>();
    public DbSet<BadmintonTransaction> Transactions => Set<BadmintonTransaction>();
    public DbSet<BadmintonFund> Funds => Set<BadmintonFund>();
    public DbSet<BadmintonFundTransaction> FundTransactions => Set<BadmintonFundTransaction>();
    public DbSet<PricingTemplate> PricingTemplates => Set<PricingTemplate>();
    public DbSet<PricingTemplateRule> PricingTemplateRules => Set<PricingTemplateRule>();
    public DbSet<CourtBooking> CourtBookings => Set<CourtBooking>();
    public DbSet<SystemConfiguration> SystemConfigurations => Set<SystemConfiguration>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);
        b.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        b.Entity<BadmintonPlayer>(e =>
        {
            e.ToTable("BadmintonPlayer");
            e.HasIndex(x => x.PhoneNumber);
            e.Property(x => x.FullName).HasMaxLength(150).IsRequired();
            e.Property(x => x.NickName).HasMaxLength(80);
            e.Property(x => x.PhoneNumber).HasMaxLength(30);
            e.Property(x => x.Email).HasMaxLength(150);
            e.Property(x => x.CurrentDebt).HasColumnType("decimal(18,2)");
            e.HasQueryFilter(x => !x.IsDeleted);
        });

        b.Entity<BadmintonCourt>(e =>
        {
            e.ToTable("BadmintonCourt");
            e.Property(x => x.Name).HasMaxLength(150).IsRequired();
            e.Property(x => x.DefaultHourlyRate).HasColumnType("decimal(18,2)");
            e.HasQueryFilter(x => !x.IsDeleted);
        });

        b.Entity<BadmintonSession>(e =>
        {
            e.ToTable("BadmintonSession");
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.TotalIncome).HasColumnType("decimal(18,2)");
            e.Property(x => x.TotalExpense).HasColumnType("decimal(18,2)");
            e.Property(x => x.Balance).HasColumnType("decimal(18,2)");
            e.Property(x => x.FeePerSlot).HasColumnType("decimal(18,2)");
            e.HasOne(x => x.Court).WithMany(c => c.Sessions).HasForeignKey(x => x.CourtId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.PricingTemplate).WithMany().HasForeignKey(x => x.PricingTemplateId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Booking).WithMany(b => b.Sessions).HasForeignKey(x => x.BookingId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => new { x.PlayDate, x.Status });
            e.HasIndex(x => x.BookingId);
            e.HasQueryFilter(x => !x.IsDeleted);
        });

        b.Entity<CourtBooking>(e =>
        {
            e.ToTable("CourtBooking");
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Pattern).HasMaxLength(1000).IsRequired();
            e.Property(x => x.Note).HasMaxLength(1000);
            e.HasOne(x => x.Court).WithMany().HasForeignKey(x => x.CourtId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.PricingTemplate).WithMany().HasForeignKey(x => x.PricingTemplateId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => new { x.CourtId, x.FromDate });
            e.HasQueryFilter(x => !x.IsDeleted);
        });

        b.Entity<BadmintonSessionParticipant>(e =>
        {
            e.ToTable("BadmintonSessionParticipant");
            e.Ignore(x => x.Debt);
            e.Property(x => x.AmountDue).HasColumnType("decimal(18,2)");
            e.Property(x => x.AmountPaid).HasColumnType("decimal(18,2)");
            e.Property(x => x.Multiplier).HasColumnType("decimal(5,2)").HasDefaultValue(1.0m);
            e.Property(x => x.FixedAmount).HasColumnType("decimal(18,2)").HasDefaultValue(0m);
            e.HasOne(x => x.Session).WithMany(s => s.Participants).HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Player).WithMany(p => p.Participations).HasForeignKey(x => x.PlayerId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.SessionId, x.PlayerId }).IsUnique();
        });

        b.Entity<PricingTemplate>(e =>
        {
            e.ToTable("PricingTemplate");
            e.Property(x => x.Name).HasMaxLength(150).IsRequired();
            e.Property(x => x.Description).HasMaxLength(500);
            e.HasIndex(x => new { x.IsDefault, x.IsActive });
            e.HasQueryFilter(x => !x.IsDeleted);
        });

        b.Entity<PricingTemplateRule>(e =>
        {
            e.ToTable("PricingTemplateRule");
            e.Property(x => x.Multiplier).HasColumnType("decimal(5,2)");
            e.Property(x => x.FixedAmount).HasColumnType("decimal(18,2)").HasDefaultValue(0m);
            e.HasOne(x => x.PricingTemplate).WithMany(t => t.Rules)
                .HasForeignKey(x => x.PricingTemplateId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.PricingTemplateId, x.Gender, x.SkillLevel });
        });

        b.Entity<BadmintonTransaction>(e =>
        {
            e.ToTable("BadmintonTransaction");
            e.Property(x => x.Amount).HasColumnType("decimal(18,2)");
            e.Property(x => x.Description).HasMaxLength(500);
            e.HasOne(x => x.Session).WithMany(s => s.Transactions).HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Player).WithMany(p => p.Transactions).HasForeignKey(x => x.PlayerId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => new { x.SessionId, x.TransactionType });
        });

        b.Entity<BadmintonFund>(e =>
        {
            e.ToTable("BadmintonFund");
            e.Property(x => x.Name).HasMaxLength(150).IsRequired();
            e.Property(x => x.CurrentBalance).HasColumnType("decimal(18,2)");
        });

        b.Entity<BadmintonFundTransaction>(e =>
        {
            e.ToTable("BadmintonFundTransaction");
            e.Property(x => x.Amount).HasColumnType("decimal(18,2)");
            e.Property(x => x.BalanceBefore).HasColumnType("decimal(18,2)");
            e.Property(x => x.BalanceAfter).HasColumnType("decimal(18,2)");
            e.HasOne(x => x.Fund).WithMany(f => f.Transactions).HasForeignKey(x => x.FundId);
            e.HasOne(x => x.Session).WithMany().HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<SystemConfiguration>(e =>
        {
            e.ToTable("SystemConfiguration");
            e.HasIndex(x => x.ConfigKey).IsUnique();
            e.Property(x => x.ConfigKey).HasMaxLength(100).IsRequired();
            e.Property(x => x.ConfigValue).HasMaxLength(2000);
        });

        b.Entity<AuditLog>(e =>
        {
            e.ToTable("AuditLog");
            e.Property(x => x.EntityName).HasMaxLength(100);
            e.Property(x => x.Action).HasMaxLength(50);
            e.HasIndex(x => new { x.EntityName, x.EntityId });
        });

        b.Entity<User>(e =>
        {
            e.ToTable("User");
            e.HasIndex(x => x.UserName).IsUnique();
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.UserName).HasMaxLength(80).IsRequired();
            e.Property(x => x.Email).HasMaxLength(150).IsRequired();
            e.Property(x => x.PasswordHash).HasMaxLength(500).IsRequired();
        });

        b.Entity<Role>(e =>
        {
            e.ToTable("Role");
            e.HasIndex(x => x.Name).IsUnique();
            e.Property(x => x.Name).HasMaxLength(50).IsRequired();
        });

        b.Entity<UserRole>(e =>
        {
            e.ToTable("UserRole");
            e.HasKey(x => new { x.UserId, x.RoleId });
            e.HasOne(x => x.User).WithMany(u => u.UserRoles).HasForeignKey(x => x.UserId);
            e.HasOne(x => x.Role).WithMany(r => r.UserRoles).HasForeignKey(x => x.RoleId);
        });
    }
}
