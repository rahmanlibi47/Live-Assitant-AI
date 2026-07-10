
import { Group, Switch, Badge, Title } from "@mantine/core";

export default function Header({
    connected,
    status,
    connect,
    disconnect,
}) {
    return (
        <>
            <Title order={5}>
                My Live Assistant
            </Title>

            <Group justify="space-between">

                <Switch
                    checked={connected}
                    label={connected ? "Disconnect" : "Connect"}
                    onChange={(e)=>
                        e.currentTarget.checked
                            ? connect()
                            : disconnect()
                    }
                />

                <Badge
                    color={connected ? "green" : "red"}
                >
                    {status}
                </Badge>

            </Group>
        </>
    );
}