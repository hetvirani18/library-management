using LibraryWebApi.Controllers;
using LibraryWebApi.Models;
using Microsoft.AspNetCore.Identity;

namespace LibraryWebApi.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var configuration = services.GetRequiredService<IConfiguration>();

        var librarianEmail = configuration["Seed:LibrarianEmail"] ?? "librarian@library.local";
        var librarianPassword = configuration["Seed:LibrarianPassword"] ?? "Librarian@123";

        var librarian = await userManager.FindByEmailAsync(librarianEmail);
        if (librarian is null)
        {
            librarian = new ApplicationUser
            {
                UserName = librarianEmail,
                Email = librarianEmail,
                FullName = "Default Librarian",
                MembershipDate = DateTime.UtcNow,
                IsActive = true,
                EmailConfirmed = true,
                Role = AuthController.LibrarianRole
            };

            await userManager.CreateAsync(librarian, librarianPassword);
        }
    }
}
