using System.Reflection;
using FluentValidation;
using Mapster;
using MapsterMapper;
using Microsoft.Extensions.DependencyInjection;

namespace TypingWar.Application;

/// <summary>Application qatlami xizmatlarini DI ga ro'yxatdan o'tkazadi.</summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        // MediatR — barcha Command/Query handlerlar
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));

        // FluentValidation — barcha validatorlar
        services.AddValidatorsFromAssembly(assembly);

        // Mapster — DTO mapping (AutoMapper EMAS)
        var config = TypeAdapterConfig.GlobalSettings;
        config.Scan(assembly);
        services.AddSingleton(config);
        services.AddScoped<IMapper, ServiceMapper>();

        return services;
    }
}
