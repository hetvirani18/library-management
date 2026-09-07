using LibraryWebApi.Controllers;
using LibraryWebApi.Models;
using Microsoft.AspNetCore.Identity;

namespace LibraryWebApi.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

        foreach (var roleName in new[] { AuthController.LibrarianRole, AuthController.MemberRole })
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new IdentityRole(roleName));
            }
        }

        const string librarianEmail = "librarian@library.local";
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
                EmailConfirmed = true
            };

            await userManager.CreateAsync(librarian, "Librarian@123");
            await userManager.AddToRoleAsync(librarian, AuthController.LibrarianRole);
        }
    }
}
